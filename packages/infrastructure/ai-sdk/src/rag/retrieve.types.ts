import type { SparseVector } from "../services/embeddings/sparse-vector.service";
import type { TraceContext } from "../types/telemetry";

/**
 * Qdrant point structure returned from search operations.
 */
export interface QdrantPoint {
  id: string | number;
  payload?: Record<string, unknown> | null;
  score?: number;
}

/**
 * Qdrant range filter for date/numeric fields.
 */
export interface QdrantRangeFilter {
  gte?: string | number;
  lte?: string | number;
  gt?: string | number;
  lt?: string | number;
}

/**
 * Qdrant match filter for exact value matching.
 */
export interface QdrantMatchFilter {
  value: string | number | boolean;
}

/**
 * Qdrant field condition for filtering.
 */
export interface QdrantFieldCondition {
  key: string;
  match?: QdrantMatchFilter;
  range?: QdrantRangeFilter;
}

/**
 * Qdrant filter with must/should/must_not conditions.
 */
export interface QdrantFilter {
  must?: Array<QdrantFieldCondition | { should: QdrantFieldCondition[] }>;
  should?: QdrantFieldCondition[];
  must_not?: QdrantFieldCondition[];
}

/**
 * Result from searching a single collection.
 */
export interface CollectionSearchResult {
  collection: string;
  points: QdrantPoint[];
  searchDuration: number;
  error?: string;
}

/**
 * Context passed to search functions containing all search parameters.
 */
export interface SearchContext {
  queryEmbedding: number[];
  sparseVector: SparseVector;
  qdrantFilter?: QdrantFilter;
  limit: number;
  scoreThreshold: number;
  collectionWeights?: Record<string, number>;
  traceContext?: TraceContext;
}

/**
 * Options for building a cache key.
 */
export interface CacheKeyOptions {
  query: string;
  collections: string[];
  types?: string[];
  scoreThreshold: number;
  filter?: Record<string, unknown>;
  collectionWeights?: Record<string, number>;
}

/**
 * Internal result with collection information before final processing.
 */
export interface ScoredPointWithCollection {
  id: string | number;
  payload?: Record<string, unknown> | null;
  score?: number;
  collection: string;
}

/**
 * Result of deduplication operation.
 */
export interface DeduplicationResult<T> {
  unique: T[];
  duplicatesRemoved: number;
}
