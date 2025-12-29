import { getLogger } from "@ait/core";
import { getQdrantClient } from "@ait/qdrant";
import { getAItClient } from "../client/ai-sdk.client";
import { getAllCollections } from "../config/collections.config";
import { getCacheProvider } from "../providers";
import { getSparseVectorService } from "../services/embeddings/sparse-vector.service";
import type { TraceContext } from "../types/telemetry";

const logger = getLogger();

export interface RetrieveOptions {
  query: string;
  collections?: string[];
  types?: string[];
  limit?: number;
  scoreThreshold?: number;
  enableCache?: boolean;
  traceContext?: TraceContext;
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
}

export async function retrieve(options: RetrieveOptions): Promise<RetrieveResult> {
  const { query, limit = 20, scoreThreshold = 0.4, enableCache = true } = options;

  const client = getAItClient();
  const qdrantClient = getQdrantClient();

  const allCollections = getAllCollections();
  const targetCollections = options.collections
    ? allCollections.filter((c) => options.collections!.includes(c.name))
    : allCollections;

  const targetTypes = (options.types || []).slice().sort().join(",");

  const existingCollections = await filterExistingCollections(qdrantClient, targetCollections);
  const collectionContext = existingCollections
    .map((c) => c.name)
    .sort()
    .join(",");

  // 1. Semantic Cache Lookup
  if (enableCache) {
    const cacheProvider = getCacheProvider();
    if (cacheProvider) {
      const cacheKey = `retrieve:${query}:${collectionContext}:${targetTypes}:${scoreThreshold}`;
      const cached = await cacheProvider.get<RetrieveResult>(cacheKey);
      if (cached) {
        logger.info("Cache hit for retrieval", { query: query.slice(0, 50), types: options.types });
        return cached;
      }
    }
  }

  const queryEmbedding = await client.embed(query);

  logger.info("Retrieving documents", {
    query: query.slice(0, 50),
    collections: existingCollections.map((c) => c.name),
    limit,
    hasTemporalFilter: !!(options.filter?.fromDate || options.filter?.toDate),
    temporalRange:
      options.filter?.fromDate || options.filter?.toDate
        ? {
            from: options.filter.fromDate,
            to: options.filter.toDate,
          }
        : undefined,
  });

  // Build Qdrant filter if dates are provided
  const must: any[] = [];
  if (options.filter?.fromDate || options.filter?.toDate) {
    const range: any = {};
    if (options.filter.fromDate) {
      range.gte =
        typeof options.filter.fromDate === "string" ? options.filter.fromDate : options.filter.fromDate.toISOString();
    }
    if (options.filter.toDate) {
      range.lte =
        typeof options.filter.toDate === "string" ? options.filter.toDate : options.filter.toDate.toISOString();
    }

    // Comprehensive list of metadata fields that might contain timestamps
    const timestampFields = [
      "metadata.createdAt",
      "metadata.playedAt",
      "metadata.updatedAt",
      "metadata.timestamp",
      "metadata.date",
      "metadata.startTime",
      "metadata.mergedAt",
      "metadata.pushedAt",
      "metadata.pushed_at",
      "metadata.merged_at",
      "metadata.created_at",
      "metadata.updated_at",
      "metadata.played_at",
      "metadata.timestamp_ms",
    ];

    must.push({
      should: timestampFields.map((field) => ({
        key: field,
        range,
      })),
    });
  }

  // Type filter if provided
  if (options.types && options.types.length > 0) {
    if (options.types.length === 1) {
      must.push({ key: "metadata.__type", match: { value: options.types[0] } });
    } else {
      must.push({
        should: options.types.map((type) => ({
          key: "metadata.__type",
          match: { value: type },
        })),
      });
    }
  }

  const qdrantFilter = must.length > 0 ? { must } : undefined;

  if (qdrantFilter) {
    logger.info("Applying Qdrant filter", {
      filterType: "temporal",
      mustConditions: must.length,
      filter: JSON.stringify(qdrantFilter).slice(0, 500),
    });
  }

  const sparseVectorService = getSparseVectorService();
  const sparseVector = sparseVectorService.generateSparseVector(query);

  const searchPromises = existingCollections.map(async (collection) => {
    try {
      // Hybrid search: Vector + Sparse Vector
      const results = await qdrantClient.search(collection.name, {
        vector: {
          name: "content", // Standard vector name for content
          vector: queryEmbedding,
        },
        sparse_vector: {
          name: "sparse-content", // Standard sparse vector name
          vector: sparseVector,
        },
        limit,
        score_threshold: scoreThreshold,
        filter: qdrantFilter,
      });
      logger.debug(`Collection ${collection.name} returned ${results.length} results via hybrid search`);
      return results.map((r: any) => ({ ...r, collection: collection.name }));
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
        return results.map((r: any) => ({ ...r, collection: collection.name }));
      } catch (fallbackError) {
        logger.error(`Fallack search also failed for ${collection.name}`, {
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
        return [];
      }
    }
  });

  const allResults = await Promise.all(searchPromises);
  const flatResults = allResults.flat();

  logger.info("Retrieval results", {
    totalResults: flatResults.length,
    byCollection: existingCollections.map((c) => ({
      name: c.name,
      count: allResults[existingCollections.indexOf(c)]?.length || 0,
    })),
  });

  const sortedResults = flatResults.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);

  const documents: RetrievedDocument[] = sortedResults.map((r: any) => ({
    id: String(r.id),
    content: (r.payload?.content as string) || "",
    score: r.score ?? 0,
    collection: r.collection,
    source: r.payload?.source as string,
    metadata: r.payload as Record<string, unknown>,
  }));

  const result = {
    documents,
    totalFound: flatResults.length,
  };

  // 4. Update Cache
  if (enableCache && documents.length > 0) {
    const cacheProvider = getCacheProvider();
    if (cacheProvider) {
      const cacheKey = `retrieve:${query}:${collectionContext}:${targetTypes}:${scoreThreshold}`;
      await cacheProvider.set(cacheKey, result);
    }
  }

  return result;
}

async function filterExistingCollections(
  qdrantClient: ReturnType<typeof getQdrantClient>,
  collections: readonly { name: string }[],
): Promise<{ name: string }[]> {
  try {
    const response = await qdrantClient.getCollections();
    const existingNames = new Set(response.collections.map((c: any) => c.name));
    const filtered = collections.filter((c) => existingNames.has(c.name));

    if (filtered.length < collections.length) {
      const missing = collections.filter((c) => !existingNames.has(c.name)).map((c) => c.name);
      logger.debug("Skipping non-existent collections", { missing });
    }

    return [...filtered]; // Convert readonly to mutable
  } catch {
    return [...collections]; // Convert readonly to mutable
  }
}
