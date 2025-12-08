import { AItError, getLogger } from "@ait/core";
import type { EmbeddingsModel, GenerationModel, ModelGenerateOptions, ModelStreamOptions } from "../types/models";
import type {
  OllamaChatGenerateOptions,
  OllamaChatRequest,
  OllamaConfig,
  OllamaEmbedRequest,
  OllamaGenerateRequest,
  OllamaGenerateResult,
  OllamaMessage,
  OllamaTool,
  OllamaToolCall,
} from "../types/providers/ollama.types";

export type {
  OllamaTool,
  OllamaToolCall,
  OllamaMessage,
  OllamaGenerateRequest,
  OllamaChatRequest,
  OllamaEmbedRequest,
  OllamaConfig,
};

const logger = getLogger();

export class OllamaProvider {
  private baseURL: string;

  constructor(config: OllamaConfig) {
    this.baseURL = config.baseURL;
  }

  createTextModel(modelName: string): GenerationModel & {
    doChatGenerate(options: OllamaChatGenerateOptions): Promise<OllamaGenerateResult>;
    doChatStream(options: ModelStreamOptions): AsyncGenerator<string>;
  } {
    const baseURL = this.baseURL;

    return {
      modelId: modelName,
      provider: "ollama",

      async doGenerate(options: ModelGenerateOptions): Promise<OllamaGenerateResult> {
        // Use chat API if tools are present or messages provided
        if (options.tools || options.messages) {
          return this.doChatGenerate(options);
        }

        const response = await fetch(`${baseURL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            prompt: options.prompt,
            stream: false,
            tools: options.tools,
            options: {
              temperature: options.temperature,
              top_p: options.topP,
              top_k: options.topK,
            },
          } as OllamaGenerateRequest),
        });

        if (!response.ok) {
          throw new AItError("OLLAMA_HTTP", `Ollama API error: ${response.status} ${response.statusText}`, {
            status: response.status,
          });
        }

        const data = (await response.json()) as {
          response: string;
          message?: { tool_calls?: OllamaToolCall[] };
        };

        return {
          text: data.response,
          toolCalls: data.message?.tool_calls,
        };
      },

      async doChatGenerate(options: OllamaChatGenerateOptions): Promise<OllamaGenerateResult> {
        // Build messages array
        const messages = options.messages || [
          {
            role: "user" as const,
            content: options.prompt || "",
          },
        ];

        const requestBody = JSON.stringify({
          model: modelName,
          messages,
          stream: false,
          tools: options.tools,
          options: {
            temperature: options.temperature,
            top_p: options.topP,
            top_k: options.topK,
          },
        } as OllamaChatRequest);

        logger.debug("[OllamaProvider] Sending chat request", {
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1],
          toolsCount: options.tools?.length,
        });

        // Check for validation issues manually
        if (messages.some((m) => !m.content && !m.tool_calls)) {
          logger.warn("[OllamaProvider] Found message with empty content and no tool_calls", { messages });
        }

        const response = await fetch(`${baseURL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error("[OllamaProvider] API Error Detail", {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          throw new AItError("OLLAMA_HTTP", `Ollama API error: ${response.status} ${response.statusText}`, {
            status: response.status,
            detail: errorText,
          });
        }

        const data = (await response.json()) as {
          message: {
            role: string;
            content: string;
            tool_calls?: OllamaToolCall[];
          };
        };

        return {
          text: data.message.content,
          toolCalls: data.message.tool_calls,
        };
      },

      async *doStream(options: ModelStreamOptions): AsyncGenerator<string> {
        // Use chat API if messages are provided
        if (options.messages) {
          yield* this.doChatStream(options);
          return;
        }

        const response = await fetch(`${baseURL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            prompt: options.prompt,
            stream: true,
            tools: options.tools,
            options: {
              temperature: options.temperature,
              top_p: options.topP,
              top_k: options.topK,
            },
          } as OllamaGenerateRequest),
        });

        if (!response.ok) {
          throw new AItError("OLLAMA_HTTP", `Ollama API error: ${response.status} ${response.statusText}`, {
            status: response.status,
          });
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new AItError("OLLAMA_NO_BODY", "No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data = JSON.parse(line);
                  if (data.response) {
                    yield data.response;
                  }
                } catch (e) {
                  logger.warn("Failed to parse streaming line:", { line });
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      },

      async *doChatStream(options: ModelStreamOptions): AsyncGenerator<string> {
        const messages = options.messages || [
          {
            role: "user" as const,
            content: options.prompt || "",
          },
        ];

        logger.debug("[OllamaProvider] Streaming chat request", {
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1],
        });

        const response = await fetch(`${baseURL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            messages,
            stream: true,
            options: {
              temperature: options.temperature,
              top_p: options.topP,
              top_k: options.topK,
            },
          } as OllamaChatRequest),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error("[OllamaProvider] Chat stream error", {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          throw new AItError("OLLAMA_HTTP", `Ollama API error: ${response.status} ${response.statusText}`, {
            status: response.status,
            detail: errorText,
          });
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new AItError("OLLAMA_NO_BODY", "No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data = JSON.parse(line);
                  // Chat API returns content in message.content
                  if (data.message?.content) {
                    yield data.message.content;
                  }
                } catch (e) {
                  logger.warn("Failed to parse chat streaming line:", { line });
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      },
    };
  }

  createEmbeddingsModel(modelName: string): EmbeddingsModel {
    const baseURL = this.baseURL;

    return {
      modelId: modelName,
      provider: "ollama",

      async doEmbed(text: string): Promise<number[]> {
        const response = await fetch(`${baseURL}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            prompt: text,
          } as OllamaEmbedRequest),
        });

        if (!response.ok) {
          throw new AItError("OLLAMA_HTTP", `Ollama API error: ${response.status} ${response.statusText}`, {
            status: response.status,
          });
        }

        const data = (await response.json()) as { embedding: number[] };
        return data.embedding;
      },
    };
  }
}
