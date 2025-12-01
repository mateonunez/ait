import { getEmbeddingModelConfig } from "../../client/ai-sdk.client";
import { getCacheService } from "../../services/cache/cache.service";
import { buildSystemPromptWithContext, buildSystemPromptWithoutContext } from "../../services/prompts/system.prompt";
import { MultiCollectionProvider } from "../../services/rag/multi-collection.provider";
import { PipelineBuilder } from "../../services/rag/pipeline/pipeline.builder";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { createMultiQueryRetrievalService } from "../../services/retrieval/multi-query-retrieval.factory";
import type { BaseMetadata, Document } from "../../types/documents";
import type { ContextPreparationInput, ContextPreparationOutput } from "../../types/stages";
import { CollectionRoutingStage } from "../rag/collection-routing.stage";
import { ContextBuildingStage } from "../rag/context-building.stage";
import { FusionStage } from "../rag/fusion.stage";
import { QueryAnalysisStage } from "../rag/query-analysis.stage";
import { RerankingStage } from "../rag/reranking.stage";
import { RetrievalStage } from "../rag/retrieval.stage";
import { SimpleRetrievalStage } from "../rag/simple-retrieval.stage";

export class ContextPreparationStage implements IPipelineStage<ContextPreparationInput, ContextPreparationOutput> {
  readonly name = "context-preparation";

  async execute(input: ContextPreparationInput, context: PipelineContext): Promise<ContextPreparationOutput> {
    if (!input.enableRAG) {
      return {
        ...input,
        systemMessage: buildSystemPromptWithoutContext(),
        ragContext: undefined,
      };
    }

    try {
      const embeddingModelConfig = getEmbeddingModelConfig();
      const multiCollectionProvider = new MultiCollectionProvider({
        embeddingsModel: embeddingModelConfig.name,
        expectedVectorSize: embeddingModelConfig.vectorSize,
        enableTelemetry: true,
      });

      const multiQueryRetrieval = createMultiQueryRetrievalService({
        maxDocs: 100,
        queryPlanner: { queriesCount: 12 },
        concurrency: 4,
      });

      const cacheService = getCacheService();

      const ragPipeline = PipelineBuilder.create()
        .addStage(new QueryAnalysisStage())
        .addStage(new SimpleRetrievalStage(multiCollectionProvider, 100))
        .addStage(new CollectionRoutingStage())
        .addStage(new RetrievalStage(multiQueryRetrieval, multiCollectionProvider, cacheService))
        .addStage(new FusionStage())
        .addStage(new RerankingStage())
        .addStage(new ContextBuildingStage())
        .withFailureMode("continue-on-error")
        .withTelemetry(true)
        .build();

      const ragResult = await ragPipeline.execute(
        {
          query: input.currentPrompt,
          messages: input.recentMessages,
          traceContext: context.traceContext,
        },
        { traceContext: context.traceContext },
      );

      if (ragResult.success && ragResult.data) {
        const contextData = ragResult.data as {
          context: string;
          documents: unknown[];
          query: string;
        };

        return {
          ...input,
          systemMessage: contextData.context
            ? buildSystemPromptWithContext(contextData.context)
            : buildSystemPromptWithoutContext(),
          ragContext: {
            context: contextData.context,
            documents: contextData.documents as Document<BaseMetadata>[],
            timestamp: Date.now(),
            query: contextData.query,
            fallbackUsed: false,
          },
        };
      }

      return {
        ...input,
        systemMessage: buildSystemPromptWithoutContext(),
        ragContext: {
          context: "",
          documents: [],
          timestamp: Date.now(),
          query: input.currentPrompt,
          fallbackUsed: true,
          fallbackReason: ragResult.error?.message || "RAG pipeline failed",
        },
      };
    } catch (error) {
      return {
        ...input,
        systemMessage: buildSystemPromptWithoutContext(),
        ragContext: {
          context: "",
          documents: [],
          timestamp: Date.now(),
          query: input.currentPrompt,
          fallbackUsed: true,
          fallbackReason: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
