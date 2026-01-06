import { computeHash, createContentHash, normalizeDate, rankAndLimit, stableStringify } from "@ait/core";
import type {
  CacheKeyOptions,
  DeduplicationResult,
  QdrantFieldCondition,
  QdrantFilter,
  ScoredPointWithCollection,
} from "./retrieve.types";

/**
 * Builds a deterministic cache key from retrieval options.
 * Includes all parameters that could affect search results.
 */
export function buildCacheKey(options: CacheKeyOptions): string {
  const cacheObject = {
    query: options.query,
    collections: [...options.collections].sort(),
    types: options.types ? [...options.types].sort() : [],
    scoreThreshold: options.scoreThreshold,
    filter: options.filter || null,
    collectionWeights: options.collectionWeights || null,
  };

  return `retrieve:${stableStringify(cacheObject)}`;
}

/**
 * Builds a hash-based cache key for very long queries or complex filters.
 * Use when the standard cache key would be excessively long.
 */
export function buildHashedCacheKey(options: CacheKeyOptions): string {
  const fullKey = buildCacheKey(options);
  return `retrieve:${computeHash(fullKey, "sha256").slice(0, 16)}`;
}

/**
 * Comprehensive list of metadata fields that might contain timestamps.
 * Used for building temporal filters.
 */
export const TIMESTAMP_FIELDS = [
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
] as const;

/**
 * Builds a Qdrant filter from retrieval options.
 */
export function createQdrantFilter(options: {
  fromDate?: string | Date;
  toDate?: string | Date;
  types?: string[];
}): QdrantFilter | undefined {
  const must: Array<QdrantFieldCondition | { should: QdrantFieldCondition[] }> = [];

  // Temporal filter
  if (options.fromDate || options.toDate) {
    const range: { gte?: string; lte?: string } = {};

    if (options.fromDate) {
      range.gte = normalizeDate(options.fromDate);
    }
    if (options.toDate) {
      range.lte = normalizeDate(options.toDate);
    }

    must.push({
      should: TIMESTAMP_FIELDS.map((field) => ({
        key: field,
        range,
      })),
    });
  }

  // Type filter
  if (options.types && options.types.length > 0) {
    if (options.types.length === 1) {
      must.push({
        key: "metadata.__type",
        match: { value: options.types[0]! },
      });
    } else {
      must.push({
        should: options.types.map((type) => ({
          key: "metadata.__type",
          match: { value: type },
        })),
      });
    }
  }

  return must.length > 0 ? { must } : undefined;
}

/**
 * Applies collection weights to scored points.
 * Documents from collections with higher weights get boosted scores.
 */
export function applyCollectionWeights(
  points: ScoredPointWithCollection[],
  collectionWeights?: Record<string, number>,
): ScoredPointWithCollection[] {
  if (!collectionWeights || Object.keys(collectionWeights).length === 0) {
    return points;
  }

  return points.map((point) => {
    const weight = collectionWeights[point.collection] ?? 1.0;
    return {
      ...point,
      score: (point.score ?? 0) * weight,
    };
  });
}

/**
 * Deduplicates results based on content similarity.
 * Keeps the document with the highest score when duplicates are found.
 */
export function deduplicateResults<T extends { payload?: Record<string, unknown> | null; score?: number }>(
  results: T[],
): DeduplicationResult<T> {
  const seen = new Map<string, T>();
  let duplicatesRemoved = 0;

  for (const result of results) {
    const content = (result.payload?.content as string | undefined) ?? "";
    if (!content) {
      // Keep results without content (use a unique key)
      seen.set(`no-content-${seen.size}`, result);
      continue;
    }

    const hash = createContentHash(content);
    const existing = seen.get(hash);

    if (existing) {
      // Keep the one with higher score
      if ((result.score ?? 0) > (existing.score ?? 0)) {
        seen.set(hash, result);
      }
      duplicatesRemoved++;
    } else {
      seen.set(hash, result);
    }
  }

  return {
    unique: Array.from(seen.values()),
    duplicatesRemoved,
  };
}

export { createContentHash, normalizeDate, rankAndLimit, stableStringify };
