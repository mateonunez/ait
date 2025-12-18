import { getLogger } from "@ait/core";
import type { createRAGPipeline } from "../../pipelines/rag.pipeline";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { GenerationState } from "../../types/stages";

const logger = getLogger();

export class RAGStage implements IPipelineStage<GenerationState, GenerationState> {
  readonly name = "rag-execution";

  private readonly _ragPipeline: ReturnType<typeof createRAGPipeline>;

  constructor(ragPipeline: ReturnType<typeof createRAGPipeline>) {
    this._ragPipeline = ragPipeline;
  }

  async canExecute(input: GenerationState): Promise<boolean> {
    return input.enableRAG;
  }

  async execute(input: GenerationState, context: PipelineContext): Promise<GenerationState> {
    const startTime = Date.now();
    const endSpan = context.traceContext
      ? createSpanWithTiming(
          "generation/rag-stage",
          "task",
          context.traceContext,
          { query: input.prompt.slice(0, 100) },
          undefined,
          new Date(startTime),
        )
      : null;

    try {
      const result = await this._ragPipeline.execute(
        { query: input.prompt, traceContext: context.traceContext },
        { traceContext: context.traceContext },
      );

      const duration = Date.now() - startTime;
      if (endSpan) endSpan({ success: result.success, duration });

      return {
        ...input,
        ragResult: result.success ? result.data : undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      if (endSpan) endSpan({ error: String(error), duration });
      logger.error(`Stage [${this.name}] failed`, { error });
      return { ...input, ragResult: undefined };
    }
  }
}
