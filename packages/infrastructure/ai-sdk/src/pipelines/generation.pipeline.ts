import { getLogger } from "@ait/core";
import { PipelineBuilder } from "../services/rag/pipeline/pipeline.builder";
import type { PipelineResult } from "../services/rag/pipeline/pipeline.types";
import { ContextPreparationStage } from "../stages/generation/context-preparation.stage";
import type { ChatMessage } from "../types/chat";
import type { BaseMetadata, Document } from "../types/documents";
import type { ContextPreparationInput, ContextPreparationOutput } from "../types/stages";
import type { TraceContext } from "../types/telemetry";

const logger = getLogger();

/**
 * Configuration for the generation pipeline.
 */
export interface GenerationPipelineConfig {
  /** Maximum context size in characters */
  maxContextChars?: number;
  /** Enable telemetry for pipeline stages */
  enableTelemetry?: boolean;
}

/**
 * Input for generation pipeline execution.
 */
export interface GenerationPipelineInput {
  /** Current user prompt */
  prompt: string;
  /** Retrieved documents from RAG */
  documents: Document<BaseMetadata>[];
  /** Conversation history */
  messages?: ChatMessage[];
  /** Original query for context */
  query?: string;
}

/**
 * Output from generation pipeline execution.
 */
export interface GenerationPipelineOutput {
  /** Built context string for LLM */
  context: string;
  /** Documents used in context */
  documents: Document<BaseMetadata>[];
  /** Whether a fallback was used */
  fallbackUsed: boolean;
  /** Reason for fallback if used */
  fallbackReason?: string;
}

/**
 * Execution options for the generation pipeline.
 */
export interface GenerationPipelineExecuteOptions {
  traceContext?: TraceContext;
  metadata?: Record<string, unknown>;
}

/**
 * Generation pipeline that chains context preparation and metadata extraction stages.
 * Follows the same pattern as RAGPipeline for consistency.
 */
export interface GenerationPipeline {
  /**
   * Execute the generation pipeline to prepare context from documents.
   */
  prepareContext(
    input: GenerationPipelineInput,
    options?: GenerationPipelineExecuteOptions,
  ): Promise<PipelineResult<GenerationPipelineOutput>>;
}

export function createGenerationPipeline(config: GenerationPipelineConfig = {}): GenerationPipeline {
  logger.info("Creating generation pipeline", { config });

  const contextPrepStage = new ContextPreparationStage({
    maxContextChars: config.maxContextChars ?? 128000,
  });

  const orchestrator = PipelineBuilder.create<ContextPreparationInput, ContextPreparationOutput>()
    .addStage(contextPrepStage)
    .withFailureMode("continue-on-error")
    .withTelemetry(config.enableTelemetry ?? true)
    .build();

  return {
    async prepareContext(
      input: GenerationPipelineInput,
      options?: GenerationPipelineExecuteOptions,
    ): Promise<PipelineResult<GenerationPipelineOutput>> {
      const startTime = Date.now();

      const pipelineInput: ContextPreparationInput = {
        messages: input.messages || [],
        currentPrompt: input.prompt,
        recentMessages: input.messages || [],
        enableRAG: true,
        estimatedTokens: 0,
        ragContext: {
          context: "",
          documents: input.documents,
          timestamp: Date.now(),
          query: input.query || input.prompt,
          fallbackUsed: false,
        },
      };

      const result = await orchestrator.execute(pipelineInput, {
        traceContext: options?.traceContext,
        metadata: options?.metadata,
      });

      const data: GenerationPipelineOutput | undefined = result.data?.ragContext
        ? {
            context: result.data.ragContext.context,
            documents: result.data.ragContext.documents,
            fallbackUsed: result.data.ragContext.fallbackUsed || false,
            fallbackReason: result.data.ragContext.fallbackReason,
          }
        : undefined;

      return {
        success: result.success,
        data,
        error: result.error,
        stageResults: result.stageResults,
        totalDuration: Date.now() - startTime,
      };
    },
  };
}
