import { getLogger } from "@ait/core";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { type IQueryIntentService, QueryIntentService } from "../../services/routing/query-intent.service";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { GenerationState } from "../../types/stages";

const logger = getLogger();

export class IntentAnalysisStage implements IPipelineStage<GenerationState, GenerationState> {
  readonly name = "intent-analysis";

  private readonly _intentService: IQueryIntentService;

  constructor(intentService?: IQueryIntentService) {
    this._intentService = intentService || new QueryIntentService();
  }

  async canExecute(input: GenerationState): Promise<boolean> {
    return !!input.prompt;
  }

  async execute(input: GenerationState, context: PipelineContext): Promise<GenerationState> {
    const startTime = Date.now();

    if (input.intent) {
      return input;
    }

    const endSpan = context.traceContext
      ? createSpanWithTiming(
          "generation/intent-analysis",
          "task",
          context.traceContext,
          { query: input.prompt.slice(0, 100) },
          undefined,
          new Date(startTime),
        )
      : null;

    try {
      const intent = await this._intentService.analyzeIntent(input.prompt, input.messages || [], context.traceContext);

      const duration = Date.now() - startTime;
      const telemetryData = {
        needsRAG: intent.needsRAG,
        needsTools: intent.needsTools,
        primaryFocus: intent.primaryFocus,
        duration,
      };

      if (endSpan) endSpan(telemetryData);

      logger.info(`Stage [${this.name}] completed`, telemetryData);

      return {
        ...input,
        intent,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      if (endSpan) {
        endSpan({
          error: error instanceof Error ? error.message : String(error),
          duration,
        });
      }

      logger.error(`Stage [${this.name}] failed`, { error, duration });
      throw error;
    }
  }
}
