import { getLogger } from "@ait/core";
import { getAItClient } from "../../client/ai-sdk.client";
import { PromptBuilderService } from "../../services/generation/prompt-builder.service";
import { ToolExecutionService } from "../../services/generation/tool-execution.service";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { convertToOllamaTools } from "../../tools/tool.converter";
import type { ToolExecutionInput, ToolExecutionOutput } from "../../types/stages";
import type { Tool } from "../../types/tools";

const logger = getLogger();

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

    // Initialize messages with full context (system + history + user)
    const currentMessages: any[] = this.promptBuilder.buildMessages(
      input.systemMessage,
      input.recentMessages,
      input.currentPrompt,
    );

    let currentPrompt = this.promptBuilder.buildPrompt({
      systemMessage: input.systemMessage,
      conversationHistory: this.formatConversation(input.recentMessages, input.summary),
      userMessage: input.currentPrompt,
    });

    for (let round = 0; round < input.maxRounds; round++) {
      logger.debug(`Tool execution round ${round}`, { messageCount: currentMessages.length });

      const checkResult = await client.generateText({
        prompt: currentPrompt,
        messages: currentMessages, // Always use the accumulated messages
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

        // Append assistant's tool calls to history
        // We convert tool calls to text to avoid 500 errors with Ollama which usually
        // doesn't support the 'tool' role correctly in history without IDs (which are missing)
        const toolNames = checkResult.toolCalls.map((tc) => tc.function.name).join(", ");
        const toolCallDetails = checkResult.toolCalls
          .map((tc) => `Tool Call: ${tc.function.name}\nArguments: ${JSON.stringify(tc.function.arguments)}`)
          .join("\n\n");

        currentMessages.push({
          role: "assistant",
          content: `${checkResult.text || `I will now execute the following tools: ${toolNames}`}\n\n${toolCallDetails}`,
        });

        // Append tool results to history
        currentMessages.push({
          role: "user",
          content: formattedToolResults,
        });

        // Continue to next round
      } else {
        // No tools called - LLM returned a final text response
        // Capture this text so we don't need to call the LLM again
        if (checkResult.text?.trim()) {
          logger.debug(`Round ${round} - LLM returned final text`, { length: checkResult.text.length });
          return {
            ...input,
            finalPrompt: currentPrompt,
            toolCalls,
            toolResults,
            hasToolCalls,
            accumulatedMessages: hasToolCalls ? currentMessages : undefined,
            finalTextResponse: checkResult.text,
          };
        }
        // No text either, just break
        break;
      }
    }

    return {
      ...input,
      finalPrompt: currentPrompt,
      toolCalls,
      toolResults,
      hasToolCalls,
      accumulatedMessages: hasToolCalls ? currentMessages : undefined,
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
