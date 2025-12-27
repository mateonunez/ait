import { getLogger } from "@ait/core";
import { getQdrantClient } from "@ait/qdrant";
import { getAItClient } from "../client/ai-sdk.client";
import { getAllCollections } from "../config/collections.config";
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

  const existingCollections = await filterExistingCollections(qdrantClient, targetCollections);
  const collectionContext = existingCollections
    .map((c) => c.name)
    .sort()
    .join(",");

  // 1. Semantic Cache Lookup
  // Cache service moved to Gateway. Caching should be handled at the application layer or injected.
  if (enableCache) {
    // No-op in SDK.
    // TODO: Implement cache injection or middleware if needed.
    logger.debug("Cache enabled but cache service not available in SDK");
  }

  const queryEmbedding = await client.embed(query);

  logger.info("Retrieving documents", {
    query: query.slice(0, 50),
    collections: existingCollections.map((c) => c.name),
    limit,
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

  const searchPromises = existingCollections.map(async (collection) => {
    try {
      const results = await qdrantClient.search(collection.name, {
        vector: queryEmbedding,
        limit,
        score_threshold: scoreThreshold,
        filter: qdrantFilter,
      });
      return results.map((r: any) => ({ ...r, collection: collection.name }));
    } catch (error) {
      logger.warn(`Failed to search collection ${collection.name}`, { error });
      return [];
    }
  });

  const allResults = await Promise.all(searchPromises);
  const flatResults = allResults.flat();

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

  // 4. Update Cache - Moved
  // if (enableCache && documents.length > 0) {
  //   await semanticCache.set(query, result, collectionContext);
  // }

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
