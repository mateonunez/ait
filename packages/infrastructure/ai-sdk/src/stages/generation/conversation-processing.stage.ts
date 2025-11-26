import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { ConversationProcessingInput, ConversationProcessingOutput } from "../../types/stages";
import type { ConversationConfig } from "../../types/text-generation";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import { ConversationManagerService } from "../../services/generation/conversation-manager.service";

export class ConversationProcessingStage
  implements IPipelineStage<ConversationProcessingInput, ConversationProcessingOutput>
{
  readonly name = "conversation-processing";

  private readonly conversationManager: ConversationManagerService;

  constructor(config?: ConversationConfig) {
    this.conversationManager = new ConversationManagerService(config);
  }

  async execute(input: ConversationProcessingInput, context: PipelineContext): Promise<ConversationProcessingOutput> {
    const endSpan = context.traceContext
      ? createSpanWithTiming(this.name, "conversation", context.traceContext, {
          messageCount: input.messages.length,
        })
      : null;

    const conversationContext = await this.conversationManager.processConversation(input.messages, input.currentPrompt);

    if (endSpan) {
      endSpan({
        recentMessageCount: conversationContext.recentMessages.length,
        hasSummary: !!conversationContext.summary,
        estimatedTokens: conversationContext.estimatedTokens,
      });
    }

    return {
      ...input,
      recentMessages: conversationContext.recentMessages,
      summary: conversationContext.summary,
      estimatedTokens: conversationContext.estimatedTokens,
    };
  }
}
