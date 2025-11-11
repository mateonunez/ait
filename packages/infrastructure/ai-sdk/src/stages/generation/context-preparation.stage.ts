import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { ContextPreparationInput, ContextPreparationOutput } from "../../types/stages";
import type { Document, BaseMetadata } from "../../types/documents";
import { buildSystemPromptWithContext, buildSystemPromptWithoutContext } from "../../services/prompts/system.prompt";
import { PipelineBuilder } from "../../services/rag/pipeline/pipeline.builder";
import { QueryAnalysisStage } from "../rag/query-analysis.stage";
import { CollectionRoutingStage } from "../rag/collection-routing.stage";
import { RetrievalStage } from "../rag/retrieval.stage";
import { FusionStage } from "../rag/fusion.stage";
import { RerankingStage } from "../rag/reranking.stage";
import { ContextBuildingStage } from "../rag/context-building.stage";
import { MultiCollectionProvider } from "../../services/rag/multi-collection.provider";
import { getEmbeddingModelConfig } from "../../client/ai-sdk.client";
import { createMultiQueryRetrievalService } from "../../services/retrieval/multi-query-retrieval.factory";

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

      const ragPipeline = PipelineBuilder.create()
        .addStage(new QueryAnalysisStage())
        .addStage(new CollectionRoutingStage())
        .addStage(new RetrievalStage(multiQueryRetrieval, multiCollectionProvider))
        .addStage(new FusionStage())
        .addStage(new RerankingStage())
        .addStage(new ContextBuildingStage())
        .withFailureMode("continue-on-error")
        .withTelemetry(true)
        .build();

      const ragResult = await ragPipeline.execute(
        { query: input.currentPrompt, traceContext: context.traceContext },
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
