import { getLogger } from "@ait/core";
import type { AItClient } from "../client/ai-sdk.client";
import { PipelineBuilder } from "../services/rag/pipeline/pipeline.builder";
import { ContextPreparationStage } from "../stages/generation/context-preparation.stage";
import { IntentAnalysisStage } from "../stages/generation/intent-analysis.stage";
import { PromptOrchestrationStage } from "../stages/generation/prompt-orchestration.stage";
import { RAGStage } from "../stages/generation/rag-execution.stage";
import { StreamingGenerationStage } from "../stages/generation/streaming-generation.stage";
import type { GenerationState } from "../types/stages";
import type { TraceContext } from "../types/telemetry";
import { createRAGPipeline } from "./rag.pipeline";

const logger = getLogger();

export interface TextGenerationPipelineConfig {
  maxContextChars?: number;
  embeddingsModel?: string;
  vectorSize?: number;
  maxDocs?: number;
  concurrency?: number;
  relevanceFloor?: number;
  enableTelemetry?: boolean;
}

export interface TextGenerationPipeline {
  execute(
    input: Omit<
      GenerationState,
      "ragResult" | "ragContext" | "intent" | "orchestrationResult" | "textStream" | "fullResponse" | "suggestions"
    >,
    options?: { traceContext?: TraceContext },
  ): Promise<GenerationState>;
}

export function createTextGenerationPipeline(
  client: AItClient,
  config: TextGenerationPipelineConfig = {},
): TextGenerationPipeline {
  const ragPipeline = createRAGPipeline({
    embeddingsModel: config.embeddingsModel,
    vectorSize: config.vectorSize,
    maxDocs: config.maxDocs ?? 100,
    concurrency: config.concurrency ?? 4,
    scoreThreshold: config.relevanceFloor ?? 0.4,
    enableTelemetry: config.enableTelemetry ?? true,
  });

  const orchestrator = PipelineBuilder.create<GenerationState, GenerationState>()
    .addStage(new RAGStage(ragPipeline))
    .addStage(new ContextPreparationStage({ maxContextChars: config.maxContextChars }))
    .addStage(new IntentAnalysisStage())
    .addStage(new PromptOrchestrationStage())
    .addStage(new StreamingGenerationStage(client))
    .withFailureMode("continue-on-error")
    .withTelemetry(config.enableTelemetry ?? true)
    .build();

  return {
    async execute(input, options) {
      logger.info("Executing Text Generation Pipeline", { prompt: input.prompt.slice(0, 50) });

      const result = await orchestrator.execute(input as GenerationState, {
        traceContext: options?.traceContext,
      });

      if (!result.success) {
        throw result.error || new Error("Text generation pipeline failed");
      }

      return result.data!;
    },
  };
}
