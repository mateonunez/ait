import type { Document, BaseMetadata } from "./documents";

/**
 * Configuration for query planning service
 */
export interface QueryPlannerConfig {
  /** Number of query variants to generate (4-16, default: 12) */
  queriesCount?: number;
  /** Temperature for LLM query generation (0-1, default: 0.8) */
  temperature?: number;
  /** Top-p sampling for query generation (0-1, default: 0.95) */
  topP?: number;
  /** Minimum acceptable query count after validation (default: queriesCount * 0.5) */
  minQueryCount?: number;
}

/**
 * Configuration for diversity validation and MMR
 */
export interface DiversityConfig {
  /** Enable result diversification using MMR (default: true) */
  enableDiversification?: boolean;
  /** Diversity lambda for MMR (0=max diversity, 1=max relevance, default: 0.7) */
  diversityLambda?: number;
  /** Minimum Jaccard similarity for query validation (default: 0.15) */
  minSimilarity?: number;
  /** Maximum Jaccard similarity for query validation (default: 0.65) */
  maxSimilarity?: number;
}

/**
 * Configuration for Reciprocal Rank Fusion
 */
export interface RankFusionConfig {
  /** RRF constant k (typical range 10-100, default: 60) */
  rrfK?: number;
  /** Weight for RRF score in final score (0-1, default: 0.8) */
  rrfWeight?: number;
  /** Weight for best similarity score in final score (0-1, default: 0.2) */
  similarityWeight?: number;
}

/**
 * Top-level configuration for multi-query retrieval
 */
export interface MultiQueryConfig {
  /** Maximum number of documents to return (default: 100) */
  maxDocs?: number;
  /** Number of concurrent query workers (1-8, default: 4) */
  concurrency?: number;
  /** Minimum score threshold (0-1, default: 0.3) */
  scoreThreshold?: number;
  /** Query planning configuration */
  queryPlanner?: QueryPlannerConfig;
  /** Diversity configuration */
  diversity?: DiversityConfig;
  /** Rank fusion configuration */
  rankFusion?: RankFusionConfig;
}

/**
 * Result of query planning with metadata
 */
export interface QueryPlanResult {
  /** Generated query variants */
  queries: string[];
  /** Source of queries (llm or heuristic) */
  source: "llm" | "heuristic";
  /** Whether diversity validation passed */
  isDiverse: boolean;
}

/**
 * Ranked result with scoring metadata
 */
export interface RankedResult<TMetadata extends BaseMetadata = BaseMetadata> {
  /** The document */
  doc: Document<TMetadata>;
  /** Final combined score */
  finalScore: number;
  /** RRF score */
  rrfScore: number;
  /** Best similarity score across queries */
  bestScore: number;
  /** Sum of similarity scores */
  sumScore: number;
  /** Number of queries where document appeared */
  hits: number;
  /** Rank positions across queries */
  ranks: number[];
}

/**
 * Type filter for domain-specific searches
 */
export interface TypeFilter {
  /** Array of document types to filter by */
  types?: string[];
}

/**
 * Query execution result from vector store
 */
export interface QueryResult<TMetadata extends BaseMetadata = BaseMetadata> {
  /** Index of the query that produced these results */
  queryIdx: number;
  /** Array of [document, score] pairs */
  results: Array<[Document<TMetadata>, number]>;
}
