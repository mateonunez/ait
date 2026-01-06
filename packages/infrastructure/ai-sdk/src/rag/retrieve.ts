import { getLogger } from "@ait/core";
import { getQdrantClient } from "@ait/qdrant";
import { getAItClient } from "../client/ai-sdk.client";
import { type CollectionConfig, getAllCollections } from "../config/collections.config";
import { SPARSE_VECTOR_NAME } from "../constants/embeddings.constants";
import { getCacheProvider } from "../providers";
import { type SparseVector, getSparseVectorService } from "../services/embeddings/sparse-vector.service";
import type { TraceContext } from "../types/telemetry";
import type { ScoredPointWithCollection } from "./retrieve.types";
import {
  applyCollectionWeights,
  buildCacheKey,
  createQdrantFilter,
  deduplicateResults,
  rankAndLimit,
} from "./retrieve.utils";

const logger = getLogger();
const cacheProvider = getCacheProvider();

export interface RetrieveOptions {
  query: string;
  collections?: string[];
  types?: string[];
  limit?: number;
  scoreThreshold?: number;
  enableCache?: boolean;
  traceContext?: TraceContext;
  collectionWeights?: Record<string, number>;
  enableDeduplication?: boolean;
  filter?: {
    fromDate?: string | Date;
    toDate?: string | Date;
    [key: string]: unknown;
  };
}

export interface RetrievedDocument {
  id: string;
  content: string;
  score: number;
  collection: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface RetrieveResult {
  documents: RetrievedDocument[];
  totalFound: number;
  cacheHit?: boolean;
  duplicatesRemoved?: number;
}

interface SearchContext {
  queryEmbedding: number[];
  sparseVector: SparseVector;
  qdrantFilter?: Record<string, unknown>;
  limit: number;
  scoreThreshold: number;
}

async function filterExistingCollections(
  qdrantClient: ReturnType<typeof getQdrantClient>,
  collections: readonly CollectionConfig[],
): Promise<CollectionConfig[]> {
  try {
    const response = await qdrantClient.getCollections();
    const existingNames = new Set(response.collections.map((c: { name: string }) => c.name));
    const filtered = collections.filter((c) => existingNames.has(c.name));

    if (filtered.length < collections.length) {
      const missing = collections.filter((c) => !existingNames.has(c.name)).map((c) => c.name);
      logger.debug("Skipping non-existent collections", { missing });
    }

    return [...filtered];
  } catch {
    return [...collections];
  }
}

async function searchCollection(
  qdrantClient: ReturnType<typeof getQdrantClient>,
  collection: CollectionConfig,
  context: SearchContext,
): Promise<ScoredPointWithCollection[]> {
  const { queryEmbedding, sparseVector, qdrantFilter, limit, scoreThreshold } = context;

  try {
    // Hybrid search: Vector + Sparse Vector using Reciprocal Rank Fusion (RRF)
    const results = await qdrantClient.query(collection.name, {
      prefetch: [
        {
          query: queryEmbedding,
          limit,
        },
        {
          query: {
            indices: sparseVector.indices,
            values: sparseVector.values,
          },
          using: SPARSE_VECTOR_NAME,
          limit,
        },
      ],
      query: {
        fusion: "rrf",
      },
      with_payload: true,
      limit,
      filter: qdrantFilter,
    });

    logger.debug(`Collection ${collection.name} returned ${results.points.length} results via hybrid search`);

    return results.points.map(
      (point: { id: string | number; payload?: Record<string, unknown> | null; score?: number }) => ({
        ...point,
        collection: collection.name,
      }),
    );
  } catch (error) {
    // Fallback for collections that don't support hybrid search yet or named vectors
    logger.warn(`Hybrid search failed for ${collection.name}, falling back to simple vector search`, {
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      const results = await qdrantClient.search(collection.name, {
        vector: queryEmbedding,
        limit,
        score_threshold: scoreThreshold,
        filter: qdrantFilter,
      });

      return results.map(
        (point: { id: string | number; payload?: Record<string, unknown> | null; score?: number }) => ({
          ...point,
          collection: collection.name,
        }),
      );
    } catch (fallbackError) {
      logger.error(`Fallback search also failed for ${collection.name}`, {
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      return [];
    }
  }
}

function processResults(
  allResults: ScoredPointWithCollection[],
  options: {
    collectionWeights?: Record<string, number>;
    enableDeduplication?: boolean;
    limit: number;
  },
): {
  documents: RetrievedDocument[];
  duplicatesRemoved: number;
} {
  let processed = allResults;
  let duplicatesRemoved = 0;

  // Apply collection weights
  if (options.collectionWeights && Object.keys(options.collectionWeights).length > 0) {
    processed = applyCollectionWeights(processed, options.collectionWeights);
  }

  // Deduplicate if enabled
  if (options.enableDeduplication !== false) {
    const deduped = deduplicateResults(processed);
    processed = deduped.unique;
    duplicatesRemoved = deduped.duplicatesRemoved;

    if (duplicatesRemoved > 0) {
      logger.debug(`Removed ${duplicatesRemoved} duplicate documents`);
    }
  }

  // Rank and limit
  const ranked = rankAndLimit(processed, options.limit);

  // Transform to RetrievedDocument format
  const documents: RetrievedDocument[] = ranked.map((point) => {
    const payload = point.payload as
      | { content?: string; metadata?: Record<string, unknown>; source?: string; [key: string]: unknown }
      | null
      | undefined;

    // Merge all payload fields into metadata - some ETLs store fields like startTime, endTime
    // at the payload root level, not nested under a metadata object
    const { content, metadata: nestedMetadata, ...restPayload } = payload || {};

    return {
      id: String(point.id),
      content: content || "",
      score: point.score ?? 0,
      collection: point.collection,
      source: (nestedMetadata?.url as string) || (payload?.source as string),
      metadata: {
        ...restPayload, // Include all payload fields (startTime, endTime, __type, etc.)
        ...nestedMetadata, // Override with any nested metadata if present
      },
    };
  });

  return { documents, duplicatesRemoved };
}

export async function retrieve(options: RetrieveOptions): Promise<RetrieveResult> {
  const { query, limit = 20, scoreThreshold = 0.4, enableCache = true, enableDeduplication = true } = options;

  const client = getAItClient();
  const qdrantClient = getQdrantClient();

  // Determine target collections
  const allCollections = getAllCollections();
  const targetCollections = options.collections
    ? allCollections.filter((c) => options.collections!.includes(c.name))
    : allCollections;

  // Filter to only existing collections
  const existingCollections = await filterExistingCollections(qdrantClient, targetCollections);

  if (existingCollections.length === 0) {
    logger.warn("No valid collections found for retrieval");
    return { documents: [], totalFound: 0 };
  }

  const collectionNames = existingCollections.map((c) => c.name).sort();
  const targetTypes = (options.types || []).slice().sort();

  // Build cache key with all relevant options
  const cacheKey = buildCacheKey({
    query,
    collections: collectionNames,
    types: targetTypes,
    scoreThreshold,
    filter: options.filter as Record<string, unknown> | undefined,
    collectionWeights: options.collectionWeights,
  });

  // Check cache
  if (enableCache && cacheProvider) {
    const cached = await cacheProvider.get<RetrieveResult>(cacheKey);
    if (cached) {
      logger.info("Cache hit for retrieval", { query: query.slice(0, 50), types: options.types });
      return { ...cached, cacheHit: true };
    }
  }

  // Generate embeddings
  const queryEmbedding = await client.embed(query);
  const sparseVectorService = getSparseVectorService();
  const sparseVector = sparseVectorService.generateSparseVector(query);

  // Build Qdrant filter
  const qdrantFilter = createQdrantFilter({
    fromDate: options.filter?.fromDate,
    toDate: options.filter?.toDate,
    types: options.types,
  });

  logger.info("Retrieving documents", {
    query: query.slice(0, 50),
    collections: collectionNames,
    limit,
    hasTemporalFilter: !!(options.filter?.fromDate || options.filter?.toDate),
    hasCollectionWeights: !!options.collectionWeights,
  });

  if (qdrantFilter) {
    logger.debug("Applying Qdrant filter", {
      filterType: options.filter?.fromDate || options.filter?.toDate ? "temporal" : "types",
      mustConditions: qdrantFilter.must?.length ?? 0,
    });
  }

  // Create search context
  const searchContext: SearchContext = {
    queryEmbedding,
    sparseVector,
    qdrantFilter: qdrantFilter as Record<string, unknown> | undefined,
    limit,
    scoreThreshold,
  };

  // Search all collections in parallel
  const searchPromises = existingCollections.map((collection) =>
    searchCollection(qdrantClient, collection, searchContext),
  );

  const allResults = await Promise.all(searchPromises);
  const flatResults = allResults.flat();

  logger.info("Retrieval results", {
    totalResults: flatResults.length,
    byCollection: existingCollections.map((c, i) => ({
      name: c.name,
      count: allResults[i]?.length || 0,
    })),
  });

  // Process and rank results
  const { documents, duplicatesRemoved } = processResults(flatResults, {
    collectionWeights: options.collectionWeights,
    enableDeduplication,
    limit,
  });

  const result: RetrieveResult = {
    documents,
    totalFound: flatResults.length,
    duplicatesRemoved: duplicatesRemoved > 0 ? duplicatesRemoved : undefined,
  };

  // Update cache
  if (enableCache && documents.length > 0 && cacheProvider) {
    await cacheProvider.set(cacheKey, result);
  }

  return result;
}
