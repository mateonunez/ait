import { getLogger } from "@ait/core";
import { PromptOrchestrationService } from "../../services/orchestration/prompt-orchestration.service";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { GenerationState } from "../../types/stages";

const logger = getLogger();

export class PromptOrchestrationStage implements IPipelineStage<GenerationState, GenerationState> {
  readonly name = "prompt-orchestration";

  private readonly _orchestrator: PromptOrchestrationService;

  constructor(orchestrator?: PromptOrchestrationService) {
    this._orchestrator = orchestrator || new PromptOrchestrationService();
  }

  async canExecute(_input: GenerationState): Promise<boolean> {
    return true;
  }

  async execute(input: GenerationState, context: PipelineContext): Promise<GenerationState> {
    const startTime = Date.now();
    const endSpan = context.traceContext
      ? createSpanWithTiming(
          "generation/prompt-orchestration",
          "task",
          context.traceContext,
          {
            hasTools: !!input.tools && Object.keys(input.tools).length > 0,
            needsTools: input.intent?.needsTools,
          },
          undefined,
          new Date(startTime),
        )
      : null;

    try {
      const result = await this._orchestrator.orchestrate({
        userPrompt: input.prompt,
        ragContext: input.ragContext,
        messages: input.messages,
        tools: input.tools,
        maxToolRounds: input.maxToolRounds,
        enableToolExecution: input.intent?.needsTools ?? false,
        traceContext: context.traceContext,
      });

      const duration = Date.now() - startTime;
      const telemetryData = {
        hasToolCalls: result.hasToolCalls,
        toolCallsCount: result.toolCalls.length,
        duration,
      };

      if (endSpan) endSpan(telemetryData);

      logger.info(`Stage [${this.name}] completed`, telemetryData);

      return {
        ...input,
        orchestrationResult: result,
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
