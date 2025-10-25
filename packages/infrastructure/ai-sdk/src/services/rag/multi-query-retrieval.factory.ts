import type { MultiQueryConfig } from "../../types/rag";
import { QueryPlannerService } from "./query-planner.service";
import { DiversityService } from "./diversity.service";
import { TypeFilterService } from "./type-filter.service";
import { RankFusionService } from "./rank-fusion.service";
import { MultiQueryRetrievalService, type IMultiQueryRetrievalService } from "./multi-query-retrieval.service";

/**
 * Factory function to create a fully configured MultiQueryRetrievalService
 * with all required dependencies
 *
 * @param config - Configuration for multi-query retrieval
 * @returns Configured multi-query retrieval service instance
 *
 * @example
 * ```typescript
 * const retriever = createMultiQueryRetrievalService({
 *   maxDocs: 50,
 *   concurrency: 4,
 *   scoreThreshold: 0.4,
 *   queryPlanner: { queriesCount: 8 },
 *   diversity: { enableDiversification: true, diversityLambda: 0.7 },
 *   rankFusion: { rrfK: 60 }
 * });
 *
 * const docs = await retriever.retrieve(vectorStore, "my github projects");
 * ```
 */
export function createMultiQueryRetrievalService(config: MultiQueryConfig = {}): IMultiQueryRetrievalService {
  // Create service dependencies
  const queryPlanner = new QueryPlannerService(config.queryPlanner);
  const diversity = new DiversityService(config.diversity);
  const typeFilter = new TypeFilterService();
  const rankFusion = new RankFusionService(config.rankFusion);

  // Create and return orchestrator service
  return new MultiQueryRetrievalService(queryPlanner, diversity, typeFilter, rankFusion, config);
}
