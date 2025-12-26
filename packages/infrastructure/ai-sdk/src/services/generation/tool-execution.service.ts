import { getLogger } from "@ait/core";
import { type AItClient, getAItClient } from "../../client/ai-sdk.client";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import { convertToOllamaTools } from "../../tools/tool.converter";
import type { ChatMessage } from "../../types/chat";
import type { OllamaToolCall } from "../../types/models";
import type { TraceContext } from "../../types/telemetry";
import type { ToolExecutionConfig, ToolExecutionResult } from "../../types/text-generation";
import type { Tool } from "../../types/tools";
import { formatConversation, formatValue } from "../../utils/format.utils";
import { PromptBuilderService } from "./prompt-builder.service";

const logger = getLogger();

/**
 * Input for the multi-round tool execution loop
 */
export interface ToolLoopInput {
  userPrompt: string;
  systemMessage: string;
  recentMessages: ChatMessage[];
  summary?: string;
  tools: Record<string, Tool>;
  maxRounds: number;
  traceContext?: TraceContext | null;
}

/**
 * Result from the multi-round tool execution loop
 */
export interface ToolLoopResult {
  finalPrompt: string;
  toolCalls: unknown[];
  toolResults: unknown[];
  hasToolCalls: boolean;
  accumulatedMessages?: ChatMessage[];
  finalTextResponse?: string;
}

/**
 * Interface for tool execution service
 */
export interface IToolExecutionService {
  /**
   * Execute multiple tool calls
   * @param toolCalls - Tool calls to execute
   * @param tools - Available tools
   * @param traceContext - Optional trace context for telemetry
   * @returns Execution results
   */
  executeToolCalls(
    toolCalls: OllamaToolCall[],
    tools: Record<string, Tool>,
    traceContext?: TraceContext | null,
  ): Promise<ToolExecutionResult[]>;

  /**
   * Execute the multi-round tool loop
   * @param input - Tool loop input
   * @returns Tool loop result with final prompt and tool results
   */
  executeToolLoop(input: ToolLoopInput): Promise<ToolLoopResult>;

  /**
   * Format tool results for prompt injection
   * @param results - Tool execution results
   * @returns Formatted results text
   */
  formatToolResults(results: ToolExecutionResult[]): string;
}

/**
 * Service for executing tools and formatting results
 */
export class ToolExecutionService implements IToolExecutionService {
  private readonly _toolTimeoutMs: number;
  private readonly _promptBuilder: PromptBuilderService;
  private readonly _client: AItClient;

  constructor(config: ToolExecutionConfig = {}) {
    this._toolTimeoutMs = Math.max(config.toolTimeoutMs ?? 30000, 1000);
    this._promptBuilder = new PromptBuilderService();
    this._client = getAItClient();
  }

  async executeToolCalls(
    toolCalls: OllamaToolCall[],
    tools: Record<string, Tool>,
    traceContext?: TraceContext | null,
  ): Promise<ToolExecutionResult[]> {
    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const toolName = toolCall.function.name;
        const tool = tools[toolName];
        const startTime = Date.now();

        if (!tool) {
          logger.warn(`Tool ${toolName} not found`);
          return {
            name: toolName,
            result: null,
            error: `Tool ${toolName} not found`,
            executionTimeMs: Date.now() - startTime,
          };
        }

        const maxAttempts = 2;
        let attempt = 0;
        let lastError: unknown;
        let finalResult: ToolExecutionResult | null = null;

        while (attempt < maxAttempts) {
          try {
            logger.info(`Executing tool: ${toolName}`, {
              arguments: toolCall.function.arguments,
              attempt: attempt + 1,
            });

            const result = await this._executeWithTimeout(
              tool.execute(toolCall.function.arguments),
              this._toolTimeoutMs,
            );

            const executionTimeMs = Date.now() - startTime;
            logger.info(`Tool ${toolName} completed`, { executionTimeMs });

            finalResult = {
              name: toolName,
              result,
              executionTimeMs,
            };

            // Record successful tool execution
            if (traceContext) {
              const endSpan = createSpanWithTiming(
                `tool/${toolName}`,
                "tool",
                traceContext,
                { toolName, parameters: toolCall.function.arguments },
                undefined,
                new Date(startTime),
              );
              if (endSpan) {
                endSpan({
                  result: typeof result === "object" ? JSON.stringify(result).slice(0, 500) : String(result),
                  executionTimeMs,
                  success: true,
                });
              }
            }

            return finalResult;
          } catch (error) {
            lastError = error;
            attempt++;
            if (attempt >= maxAttempts) {
              const executionTimeMs = Date.now() - startTime;
              const errMsg = error instanceof Error ? error.message : String(error);
              logger.error(`Tool ${toolName} failed`, { error: errMsg, executionTimeMs });

              finalResult = {
                name: toolName,
                result: null,
                error: errMsg,
                executionTimeMs,
              };

              // Record failed tool execution
              if (traceContext) {
                const endSpan = createSpanWithTiming(
                  `tool/${toolName}`,
                  "tool",
                  traceContext,
                  { toolName, parameters: toolCall.function.arguments },
                  undefined,
                  new Date(startTime),
                );
                if (endSpan) {
                  endSpan({
                    error: errMsg,
                    executionTimeMs,
                    success: false,
                  });
                }
              }

              return finalResult;
            }
            // small jitter before retry
            await new Promise((r) => setTimeout(r, 150 + Math.floor(Math.random() * 200)));
          }
        }
        const executionTimeMs = Date.now() - startTime;
        return { name: toolName, result: null, error: String(lastError ?? "Unknown error"), executionTimeMs };
      }),
    );

    return results;
  }

  formatToolResults(results: ToolExecutionResult[]): string {
    const parts: string[] = ["## Current Real-Time Information\n"];

    for (const result of results) {
      if (result.error) {
        parts.push(`- ${result.name} encountered an issue: ${result.error}`);
      } else {
        parts.push(`- ${result.name} → ${formatValue(result.result)}`);
      }
    }

    parts.push(
      "\n**IMPORTANT**: Use this information to CONTINUE executing tools to complete the user's request. If the user asked to send a message, post something, or create a resource, use the appropriate tool NOW with the information above. Only respond with text AFTER all actions are complete or if you need clarification.",
    );

    const formatted = parts.join("\n");
    logger.debug("[ToolExecutionService] Formatted tool results", {
      resultCount: results.length,
      formattedLength: formatted.length,
      preview: formatted.substring(0, 500),
    });

    return formatted;
  }

  /**
   * Execute the multi-round tool execution loop
   * Handles the full cycle of: check for tool calls → execute → append results → repeat
   */
  async executeToolLoop(input: ToolLoopInput): Promise<ToolLoopResult> {
    const modelSupportsTools = this._client.generationModelConfig.supportsTools ?? true;

    // Fast path: no tools, model doesn't support tools, or maxRounds is 0
    if (!input.tools || Object.keys(input.tools).length === 0 || !modelSupportsTools || input.maxRounds === 0) {
      const finalPrompt = this._promptBuilder.buildPrompt({
        systemMessage: input.systemMessage,
        conversationHistory: formatConversation(input.recentMessages, input.summary),
        userMessage: input.userPrompt,
      });

      return {
        finalPrompt,
        toolCalls: [],
        toolResults: [],
        hasToolCalls: false,
      };
    }

    const ollamaTools = convertToOllamaTools(input.tools);
    const toolCalls: unknown[] = [];
    const toolResults: unknown[] = [];
    let hasToolCalls = false;
    let finalRoundText: string | undefined;

    // Initialize messages with full context (system + history + user)
    const currentMessages = this._promptBuilder.buildMessages(
      input.systemMessage,
      input.recentMessages,
      input.userPrompt,
    );

    let currentPrompt = this._promptBuilder.buildPrompt({
      systemMessage: input.systemMessage,
      conversationHistory: formatConversation(input.recentMessages, input.summary),
      userMessage: input.userPrompt,
    });

    for (let round = 0; round < input.maxRounds; round++) {
      logger.debug(`Tool execution round ${round}`, { messageCount: currentMessages.length });

      const checkResult = await this._client.generateText({
        prompt: currentPrompt,
        messages: currentMessages,
        tools: ollamaTools,
        temperature: this._client.config.generation.temperature,
        topP: this._client.config.generation.topP,
        topK: this._client.config.generation.topK,
      });

      if (checkResult.toolCalls && checkResult.toolCalls.length > 0) {
        hasToolCalls = true;
        toolCalls.push(...checkResult.toolCalls);

        const roundResults = await this.executeToolCalls(checkResult.toolCalls, input.tools, input.traceContext);

        toolResults.push(...roundResults);

        const formattedToolResults = this.formatToolResults(roundResults);

        currentPrompt = this._promptBuilder.buildPrompt({
          systemMessage: input.systemMessage,
          conversationHistory: formatConversation(input.recentMessages, input.summary),
          userMessage: input.userPrompt,
          toolResults: formattedToolResults,
        });

        // Append assistant's tool calls to history
        const toolNames = checkResult.toolCalls.map((tc) => tc.function.name).join(", ");
        const toolCallDetails = checkResult.toolCalls
          .map((tc) => `Tool Call: ${tc.function.name}\nArguments: ${JSON.stringify(tc.function.arguments)}`)
          .join("\n\n");

        currentMessages.push({
          role: "assistant" as const,
          content: `${checkResult.text || `I will now execute the following tools: ${toolNames}`}\n\n${toolCallDetails}`,
        });

        // Append tool results to history
        currentMessages.push({
          role: "user" as const,
          content: formattedToolResults,
        });
      } else {
        if (checkResult.text?.trim()) {
          logger.debug(`Round ${round} - LLM returned final text`, { length: checkResult.text.length });
          finalRoundText = checkResult.text;
        }
        break;
      }
    }

    return {
      finalPrompt: currentPrompt,
      toolCalls,
      toolResults,
      hasToolCalls,
      accumulatedMessages: hasToolCalls
        ? (currentMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })) as ChatMessage[])
        : undefined,
      finalTextResponse: finalRoundText,
    };
  }

  private async _executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }
}
