import type { ChatMessage } from "../../types/chat";
import type { TraceContext } from "../../types/telemetry";
import type { ConversationConfig } from "../../types/text-generation";
import type { Tool } from "../../types/tools";
import { ConversationManagerService } from "../generation/conversation-manager.service";
import { PromptBuilderService } from "../generation/prompt-builder.service";
import { ToolExecutionService } from "../generation/tool-execution.service";
import { buildSystemPromptWithContext, buildSystemPromptWithoutContext } from "../prompts/system.prompt";

export interface PromptOrchestrationInput {
  userPrompt: string;
  ragContext?: string;
  messages?: ChatMessage[];
  tools?: Record<string, Tool>;
  maxToolRounds?: number;
  enableToolExecution?: boolean;
  conversationConfig?: ConversationConfig;
  traceContext?: TraceContext | null;
}

export interface PromptOrchestrationOutput {
  finalPrompt: string;
  toolCalls: unknown[];
  toolResults: unknown[];
  hasToolCalls: boolean;
  accumulatedMessages?: ChatMessage[];
  finalTextResponse?: string;
}

export class PromptOrchestrationService {
  private readonly _promptBuilder: PromptBuilderService;
  private readonly _conversationManager: ConversationManagerService;
  private readonly _toolExecutionService: ToolExecutionService;

  constructor(conversationConfig?: ConversationConfig) {
    this._promptBuilder = new PromptBuilderService();
    this._conversationManager = new ConversationManagerService(conversationConfig);
    this._toolExecutionService = new ToolExecutionService();
  }

  async orchestrate(input: PromptOrchestrationInput): Promise<PromptOrchestrationOutput> {
    // Process conversation using the service directly
    const conversationContext = await this._conversationManager.processConversation(input.messages, input.userPrompt);

    const systemPrompt = input.ragContext
      ? buildSystemPromptWithContext(input.ragContext)
      : buildSystemPromptWithoutContext();

    const maxToolRounds = input.maxToolRounds ?? 1;

    if (input.enableToolExecution && input.tools && Object.keys(input.tools).length > 0 && maxToolRounds > 0) {
      // Execute tool loop using the service directly
      const toolResult = await this._toolExecutionService.executeToolLoop({
        userPrompt: input.userPrompt,
        systemMessage: systemPrompt,
        recentMessages: conversationContext.recentMessages,
        summary: conversationContext.summary,
        tools: input.tools,
        maxRounds: maxToolRounds,
        traceContext: input.traceContext,
      });

      return {
        finalPrompt: toolResult.finalPrompt,
        toolCalls: toolResult.toolCalls,
        toolResults: toolResult.toolResults,
        hasToolCalls: toolResult.hasToolCalls,
        accumulatedMessages: toolResult.accumulatedMessages,
        finalTextResponse: toolResult.finalTextResponse,
      };
    }

    // No tool execution path - build prompt directly
    const conversationHistory = conversationContext.recentMessages
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n");

    const finalPrompt = this._promptBuilder.buildPrompt({
      systemMessage: systemPrompt,
      conversationHistory,
      userMessage: input.userPrompt,
    });

    return {
      finalPrompt,
      toolCalls: [],
      toolResults: [],
      hasToolCalls: false,
    };
  }
}
