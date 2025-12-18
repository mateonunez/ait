import { getLogger } from "@ait/core";
import { ConversationManagerService } from "../../services/generation/conversation-manager.service";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { ConversationProcessingInput, ConversationProcessingOutput } from "../../types/stages";
import type { ConversationConfig } from "../../types/text-generation";

export class ConversationProcessingStage
  implements IPipelineStage<ConversationProcessingInput, ConversationProcessingOutput>
{
  readonly name = "conversation-processing";

  private readonly conversationManager: ConversationManagerService;
  private readonly logger = getLogger();

  constructor(config?: ConversationConfig) {
    this.conversationManager = new ConversationManagerService(config);
  }

  async execute(input: ConversationProcessingInput, context: PipelineContext): Promise<ConversationProcessingOutput> {
    const startTime = Date.now();
    const endSpan = context.traceContext
      ? createSpanWithTiming(
          "generation/conversation-processing",
          "conversation",
          context.traceContext,
          {
            messageCount: input.messages.length,
          },
          undefined,
          new Date(startTime),
        )
      : null;

    const conversationContext = await this.conversationManager.processConversation(input.messages, input.currentPrompt);

    const telemetryData = {
      recentMessageCount: conversationContext.recentMessages.length,
      hasSummary: !!conversationContext.summary,
      estimatedTokens: conversationContext.estimatedTokens,
      duration: Date.now() - startTime,
    };

    if (endSpan) endSpan(telemetryData);

    this.logger.info(`Stage [${this.name}] completed`, telemetryData);

    return {
      ...input,
      recentMessages: conversationContext.recentMessages,
      summary: conversationContext.summary,
      estimatedTokens: conversationContext.estimatedTokens,
    };
  }
}
