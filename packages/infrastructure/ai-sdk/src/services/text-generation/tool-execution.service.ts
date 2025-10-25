import type { ToolExecutionResult, ToolExecutionConfig } from "../../types/text-generation";
import type { Tool } from "../../types/tools";
import type { OllamaToolCall } from "../../client/ollama.provider";

/**
 * Interface for tool execution service
 */
export interface IToolExecutionService {
  /**
   * Execute multiple tool calls
   * @param toolCalls - Tool calls to execute
   * @param tools - Available tools
   * @returns Execution results
   */
  executeToolCalls(toolCalls: OllamaToolCall[], tools: Record<string, Tool>): Promise<ToolExecutionResult[]>;

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

  constructor(config: ToolExecutionConfig = {}) {
    this._toolTimeoutMs = Math.max(config.toolTimeoutMs ?? 30000, 1000);
  }

  async executeToolCalls(toolCalls: OllamaToolCall[], tools: Record<string, Tool>): Promise<ToolExecutionResult[]> {
    console.info("Executing tools...", {
      toolNames: toolCalls.map((tc) => tc.function.name),
    });

    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const toolName = toolCall.function.name;
        const tool = tools[toolName];
        const startTime = Date.now();

        if (!tool) {
          console.warn(`Tool ${toolName} not found`);
          return {
            name: toolName,
            result: null,
            error: `Tool ${toolName} not found`,
            executionTimeMs: Date.now() - startTime,
          };
        }

        try {
          console.info(`Executing tool: ${toolName}`, { arguments: toolCall.function.arguments });

          const result = await this._executeWithTimeout(tool.execute(toolCall.function.arguments), this._toolTimeoutMs);

          const executionTimeMs = Date.now() - startTime;
          console.info(`Tool ${toolName} completed`, { result, executionTimeMs });

          return {
            name: toolName,
            result,
            executionTimeMs,
          };
        } catch (error) {
          const executionTimeMs = Date.now() - startTime;
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`Tool ${toolName} failed`, { error: errMsg, executionTimeMs });

          return {
            name: toolName,
            result: null,
            error: errMsg,
            executionTimeMs,
          };
        }
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
        parts.push(JSON.stringify(result.result, null, 2));
      }
    }

    parts.push(
      "\nThis is current, real-time information. You now have this knowledge. Answer the user's query naturally, in your voice, as if you've always known this. Weave in relevant context from memory when it adds depth. Never cite sources or say where this came from. Just speak it as your own knowledge.",
    );

    return parts.join("\n");
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
