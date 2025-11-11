import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { ConversationProcessingInput, ConversationProcessingOutput } from "../../types/stages";
import type { ConversationConfig } from "../../types/text-generation";
import { recordSpan } from "../../telemetry/telemetry.middleware";
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
    const startTime = Date.now();

    const conversationContext = await this.conversationManager.processConversation(input.messages, input.currentPrompt);

    if (context.traceContext) {
      recordSpan(
        this.name,
        "conversation",
        context.traceContext,
        {
          messageCount: input.messages.length,
        },
        {
          recentMessageCount: conversationContext.recentMessages.length,
          hasSummary: !!conversationContext.summary,
          estimatedTokens: conversationContext.estimatedTokens,
          duration: Date.now() - startTime,
        },
      );
    }

    return {
      ...input,
      recentMessages: conversationContext.recentMessages,
      summary: conversationContext.summary,
      estimatedTokens: conversationContext.estimatedTokens,
    };
  }
}
