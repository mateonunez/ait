import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { ToolExecutionInput, ToolExecutionOutput } from "../../types/stages";
import { getAItClient } from "../../client/ai-sdk.client";
import { convertToOllamaTools } from "../../tools/tool.converter";
import type { Tool } from "../../types/tools";
import { PromptBuilderService } from "../../services/generation/prompt-builder.service";
import { ToolExecutionService } from "../../services/generation/tool-execution.service";

export class ToolExecutionStage implements IPipelineStage<ToolExecutionInput, ToolExecutionOutput> {
  readonly name = "tool-execution";

  private readonly toolExecutionService: ToolExecutionService;
  private readonly promptBuilder: PromptBuilderService;

  constructor() {
    this.toolExecutionService = new ToolExecutionService();
    this.promptBuilder = new PromptBuilderService();
  }

  async execute(input: ToolExecutionInput, context: PipelineContext): Promise<ToolExecutionOutput> {
    const client = getAItClient();
    const modelSupportsTools = client.generationModelConfig.supportsTools ?? true;

    if (!input.tools || !modelSupportsTools || input.maxRounds === 0) {
      const finalPrompt = this.promptBuilder.buildPrompt({
        systemMessage: input.systemMessage,
        conversationHistory: this.formatConversation(input.recentMessages, input.summary),
        userMessage: input.currentPrompt,
      });

      return {
        ...input,
        finalPrompt,
        toolCalls: [],
        toolResults: [],
        hasToolCalls: false,
      };
    }

    const ollamaTools = convertToOllamaTools(input.tools as Record<string, Tool>);
    const toolCalls: unknown[] = [];
    const toolResults: unknown[] = [];
    let hasToolCalls = false;

    let currentPrompt = this.promptBuilder.buildPrompt({
      systemMessage: input.systemMessage,
      conversationHistory: this.formatConversation(input.recentMessages, input.summary),
      userMessage: input.currentPrompt,
    });

    for (let round = 0; round < input.maxRounds; round++) {
      const messages = this.promptBuilder.buildMessages(input.systemMessage, input.recentMessages, input.currentPrompt);

      const checkResult = await client.generateText({
        prompt: currentPrompt,
        messages,
        tools: ollamaTools,
        temperature: client.config.generation.temperature,
        topP: client.config.generation.topP,
        topK: client.config.generation.topK,
      });

      if (checkResult.toolCalls && checkResult.toolCalls.length > 0) {
        hasToolCalls = true;
        toolCalls.push(...checkResult.toolCalls);

        const roundResults = await this.toolExecutionService.executeToolCalls(
          checkResult.toolCalls,
          input.tools as Record<string, Tool>,
          context.traceContext,
        );

        toolResults.push(...roundResults);

        const formattedToolResults = this.toolExecutionService.formatToolResults(roundResults);

        currentPrompt = this.promptBuilder.buildPrompt({
          systemMessage: input.systemMessage,
          conversationHistory: this.formatConversation(input.recentMessages, input.summary),
          userMessage: input.currentPrompt,
          toolResults: formattedToolResults,
        });

        break;
      }
    }

    return {
      ...input,
      finalPrompt: currentPrompt,
      toolCalls,
      toolResults,
      hasToolCalls,
    };
  }

  private formatConversation(messages: ToolExecutionInput["recentMessages"], summary?: string): string {
    const parts: string[] = [];

    if (summary) {
      parts.push(summary);
    }

    if (messages.length > 0) {
      const formatted = messages
        .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n\n");
      parts.push(formatted);
    }

    return parts.join("\n\n");
  }
}
