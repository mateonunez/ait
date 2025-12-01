import { getEmbeddingModelConfig } from "../../client/ai-sdk.client";
import type { MultiQueryConfig } from "../../types/rag";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { DiversityService } from "../filtering/diversity.service";
import { TypeFilterService } from "../filtering/type-filter.service";
import { RankFusionService } from "../ranking/rank-fusion.service";
import { RerankService } from "../ranking/rerank.service";
import { QueryHeuristicService } from "../routing/query-heuristic.service";
import { QueryIntentService } from "../routing/query-intent.service";
import { HyDEService } from "./hyde.service";
import { type IMultiQueryRetrievalService, MultiQueryRetrievalService } from "./multi-query-retrieval.service";
import { QueryPlannerService } from "./query-planner.service";

export function createMultiQueryRetrievalService(config: MultiQueryConfig = {}): IMultiQueryRetrievalService {
  const heuristics = new QueryHeuristicService();
  const intentService = new QueryIntentService();
  const queryPlanner = new QueryPlannerService(config.queryPlanner, heuristics, intentService);
  const diversity = new DiversityService(config.diversity);
  const typeFilter = new TypeFilterService();
  const rankFusion = new RankFusionService(config.rankFusion);

  const embeddingModelConfig = getEmbeddingModelConfig();
  const embeddingsService = new EmbeddingsService(embeddingModelConfig.name, embeddingModelConfig.vectorSize, {
    concurrencyLimit: 4,
  });

  const hyde = new HyDEService(embeddingsService);
  const reranker = new RerankService();

  return new MultiQueryRetrievalService(
    queryPlanner,
    diversity,
    typeFilter,
    rankFusion,
    config,
    hyde,
    reranker,
    intentService,
    heuristics,
  );
}
