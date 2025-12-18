import { getLogger } from "@ait/core";
import { SmartContextManager } from "../../services/context/smart/smart-context.manager";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { BaseMetadata, Document } from "../../types/documents";
import type { GenerationState } from "../../types/stages";

export class ContextPreparationStage implements IPipelineStage<GenerationState, GenerationState> {
  readonly name = "context-preparation";

  private readonly contextManager: SmartContextManager;
  private readonly logger = getLogger();

  constructor(config?: { maxContextChars?: number }) {
    this.contextManager = new SmartContextManager({
      totalTokenLimit: config?.maxContextChars ? Math.floor(config.maxContextChars / 4) : undefined,
    });
  }

  async execute(input: GenerationState, context: PipelineContext): Promise<GenerationState> {
    const startTime = Date.now();
    if (!input.enableRAG) {
      return {
        ...input,
        ragContext: undefined,
      };
    }

    // Input documents come from the RAG pipeline execution result
    const documents = input.ragResult?.documents || [];

    const endSpan = context.traceContext
      ? createSpanWithTiming(
          "generation/context-preparation",
          "context_preparation",
          context.traceContext,
          { documentCount: documents.length },
          undefined,
          new Date(startTime),
        )
      : null;

    try {
      const builtContext = await this.contextManager.assembleContext({
        systemInstructions: "", // System prompt is handled separately in PromptOrchestrationStage
        messages: input.messages || [],
        retrievedDocs: documents as Document<BaseMetadata>[],
      });

      const telemetryData = {
        documentCount: documents.length,
        messageCount: input.messages?.length || 0,
        contextLength: builtContext.length,
        duration: Date.now() - startTime,
      };

      if (endSpan) endSpan(telemetryData);

      this.logger.info(`Stage [${this.name}] completed`, telemetryData);

      return {
        ...input,
        ragContext: builtContext,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      if (endSpan) {
        endSpan({
          error: error instanceof Error ? error.message : String(error),
          duration,
        });
      }

      this.logger.error(`Stage [${this.name}] failed`, {
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback
      return {
        ...input,
        ragContext: "",
      };
    }
  }
}
