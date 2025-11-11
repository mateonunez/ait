import type { MultiQueryConfig } from "../../types/rag";
import { QueryPlannerService } from "./query-planner.service";
import { DiversityService } from "../filtering/diversity.service";
import { TypeFilterService } from "../filtering/type-filter.service";
import { RankFusionService } from "../ranking/rank-fusion.service";
import { HyDEService } from "./hyde.service";
import { RerankService } from "../ranking/rerank.service";
import { MultiQueryRetrievalService, type IMultiQueryRetrievalService } from "./multi-query-retrieval.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { getEmbeddingModelConfig } from "../../client/ai-sdk.client";
import { QueryHeuristicService } from "../routing/query-heuristic.service";

export function createMultiQueryRetrievalService(config: MultiQueryConfig = {}): IMultiQueryRetrievalService {
  const heuristics = new QueryHeuristicService();
  const queryPlanner = new QueryPlannerService(config.queryPlanner, heuristics);
  const diversity = new DiversityService(config.diversity);
  const typeFilter = new TypeFilterService();
  const rankFusion = new RankFusionService(config.rankFusion);

  const embeddingModelConfig = getEmbeddingModelConfig();
  const embeddingsService = new EmbeddingsService(embeddingModelConfig.name, embeddingModelConfig.vectorSize, {
    concurrencyLimit: 4,
  });

  const hyde = new HyDEService(embeddingsService);
  const reranker = new RerankService();

  return new MultiQueryRetrievalService(queryPlanner, diversity, typeFilter, rankFusion, config, hyde, reranker);
}
