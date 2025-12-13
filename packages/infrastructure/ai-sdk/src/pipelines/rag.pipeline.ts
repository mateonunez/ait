import { MultiCollectionProvider } from "../services/rag/multi-collection.provider";
import { PipelineBuilder } from "../services/rag/pipeline/pipeline.builder";
import type { PipelineOrchestrator } from "../services/rag/pipeline/pipeline.orchestrator";
import { createMultiQueryRetrievalService } from "../services/retrieval/multi-query-retrieval.factory";
import { CollectionRoutingStage } from "../stages/rag/collection-routing.stage";
import { ContextBuildingStage } from "../stages/rag/context-building.stage";
import { FusionStage } from "../stages/rag/fusion.stage";
import { HyDEStage } from "../stages/rag/hyde.stage";
import { QueryAnalysisStage } from "../stages/rag/query-analysis.stage";
import { RerankingStage } from "../stages/rag/reranking.stage";
import { RetrievalStage } from "../stages/rag/retrieval.stage";
import { SimpleRetrievalStage } from "../stages/rag/simple-retrieval.stage";
import type { ContextBuildingOutput, QueryAnalysisInput } from "../types/stages";

export interface RAGPipelineConfig {
  embeddingsModel?: string;
  vectorSize?: number;
  maxDocs?: number;
  queriesCount?: number;
  concurrency?: number;
  enableHyDE?: boolean;
  collectionRouting?: {
    temperature?: number;
    minConfidenceThreshold?: number;
    enableLLMRouting?: boolean;
    llmRoutingConfidenceThreshold?: number;
  };
  reranking?: {
    enableLLMReranking?: boolean;
    useCollectionSpecificPrompts?: boolean;
  };
  contextBuilding?: {
    temporalWindowHours?: number;
    maxContextChars?: number;
  };
  enableTelemetry?: boolean;
}

export function createRAGPipeline(
  config: RAGPipelineConfig = {},
): PipelineOrchestrator<QueryAnalysisInput, ContextBuildingOutput> {
  const multiCollectionProvider = new MultiCollectionProvider({
    embeddingsModel: config.embeddingsModel,
    expectedVectorSize: config.vectorSize,
    enableTelemetry: config.enableTelemetry ?? true,
  });

  const multiQueryRetrieval = createMultiQueryRetrievalService({
    maxDocs: config.maxDocs ?? 100,
    queryPlanner: {
      queriesCount: config.queriesCount ?? 12,
    },
    concurrency: config.concurrency ?? 4,
  });

  const pipeline = PipelineBuilder.create<QueryAnalysisInput, ContextBuildingOutput>()
    .addStage(new QueryAnalysisStage())
    .addStage(new SimpleRetrievalStage(multiCollectionProvider, config.maxDocs))
    .addStage(new CollectionRoutingStage(config.collectionRouting));

  if (config.enableHyDE) {
    pipeline.addStage(new HyDEStage());
  }

  return pipeline
    .addStage(new RetrievalStage(multiQueryRetrieval, multiCollectionProvider))
    .addStage(new FusionStage())
    .addStage(new RerankingStage(config.reranking))
    .addStage(new ContextBuildingStage(config.contextBuilding))
    .withFailureMode("continue-on-error")
    .withTelemetry(config.enableTelemetry ?? true)
    .build();
}
