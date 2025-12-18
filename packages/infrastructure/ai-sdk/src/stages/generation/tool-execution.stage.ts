import { getLogger } from "@ait/core";
import { ToolExecutionService } from "../../services/generation/tool-execution.service";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { ToolExecutionInput, ToolExecutionOutput } from "../../types/stages";

const logger = getLogger();

/**
 * Pipeline stage wrapper for tool execution.
 * Delegates to ToolExecutionService and adds telemetry.
 */
export class ToolExecutionStage implements IPipelineStage<ToolExecutionInput, ToolExecutionOutput> {
  readonly name = "tool-execution";

  private readonly toolExecutionService: ToolExecutionService;

  constructor() {
    this.toolExecutionService = new ToolExecutionService();
  }

  async execute(input: ToolExecutionInput, context: PipelineContext): Promise<ToolExecutionOutput> {
    const startTime = Date.now();
    const endSpan = context.traceContext
      ? createSpanWithTiming(
          "generation/tool-execution",
          "tool",
          context.traceContext,
          {
            availableTools: input.tools ? Object.keys(input.tools) : [],
            maxRounds: input.maxRounds,
          },
          undefined,
          new Date(startTime),
        )
      : null;

    // Delegate to the service
    const result = await this.toolExecutionService.executeToolLoop({
      userPrompt: input.currentPrompt,
      systemMessage: input.systemMessage,
      recentMessages: input.recentMessages,
      summary: input.summary,
      tools: (input.tools || {}) as Record<string, import("../../types/tools").Tool>,
      maxRounds: input.maxRounds,
      traceContext: context.traceContext,
    });

    const telemetryData = {
      hasToolCalls: result.hasToolCalls,
      toolCallsCount: result.toolCalls.length,
      toolResultsCount: result.toolResults.length,
      wasFinalTextReturned: !!result.finalTextResponse,
      duration: Date.now() - startTime,
    };

    if (endSpan) endSpan(telemetryData);

    logger.info(`Stage [${this.name}] completed`, telemetryData);

    return {
      ...input,
      finalPrompt: result.finalPrompt,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults,
      hasToolCalls: result.hasToolCalls,
      accumulatedMessages: result.accumulatedMessages,
      finalTextResponse: result.finalTextResponse,
    };
  }
}
