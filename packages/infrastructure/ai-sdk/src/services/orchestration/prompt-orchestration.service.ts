import { ConversationProcessingStage } from "../../stages/generation/conversation-processing.stage";
import { ToolExecutionStage } from "../../stages/generation/tool-execution.stage";
import type { ChatMessage } from "../../types/chat";
import type { TraceContext } from "../../types/telemetry";
import type { ConversationConfig } from "../../types/text-generation";
import type { Tool } from "../../types/tools";
import { PromptBuilderService } from "../generation/prompt-builder.service";
import { buildSystemPromptWithContext, buildSystemPromptWithoutContext } from "../prompts/system.prompt";

export interface PromptOrchestrationInput {
  userPrompt: string;
  ragContext?: string;
  messages?: ChatMessage[];
  tools?: Record<string, Tool>;
  maxToolRounds?: number;
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
  private readonly promptBuilder: PromptBuilderService;
  private readonly conversationStage: ConversationProcessingStage;
  private readonly toolStage: ToolExecutionStage;

  constructor(conversationConfig?: ConversationConfig) {
    this.promptBuilder = new PromptBuilderService();
    this.conversationStage = new ConversationProcessingStage(conversationConfig);
    this.toolStage = new ToolExecutionStage();
  }

  async orchestrate(input: PromptOrchestrationInput): Promise<PromptOrchestrationOutput> {
    const conversationResult = await this.conversationStage.execute(
      {
        messages: input.messages || [],
        currentPrompt: input.userPrompt,
      },
      {
        traceContext: input.traceContext || undefined,
        metadata: {},
        state: new Map(),
        telemetry: { recordStage: () => {} },
      },
    );

    const systemPrompt = input.ragContext
      ? buildSystemPromptWithContext(input.ragContext)
      : buildSystemPromptWithoutContext();

    const maxToolRounds = input.maxToolRounds ?? 1;
    const toolCalls: unknown[] = [];
    const toolResults: unknown[] = [];
    let hasToolCalls = false;
    let finalPrompt: string;
    let accumulatedMessages: ChatMessage[] | undefined;
    let finalTextResponse: string | undefined;

    if (input.tools && maxToolRounds > 0) {
      const toolResult = await this.toolStage.execute(
        {
          ...conversationResult,
          systemMessage: systemPrompt,
          tools: input.tools,
          maxRounds: maxToolRounds,
        },
        {
          traceContext: input.traceContext || undefined,
          metadata: {},
          state: new Map(),
          telemetry: { recordStage: () => {} },
        },
      );

      finalPrompt = toolResult.finalPrompt;
      toolCalls.push(...toolResult.toolCalls);
      toolResults.push(...toolResult.toolResults);
      hasToolCalls = toolResult.hasToolCalls;
      accumulatedMessages = toolResult.accumulatedMessages as ChatMessage[] | undefined;
      finalTextResponse = toolResult.finalTextResponse;
    } else {
      finalPrompt = this.promptBuilder.buildPrompt({
        systemMessage: systemPrompt,
        conversationHistory: conversationResult.recentMessages
          .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n\n"),
        userMessage: input.userPrompt,
      });
    }

    return {
      finalPrompt,
      toolCalls,
      toolResults,
      hasToolCalls,
      accumulatedMessages,
      finalTextResponse,
    };
  }
}
