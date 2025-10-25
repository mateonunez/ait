export interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  tools?: OllamaTool[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  tools?: OllamaTool[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

export interface OllamaConfig {
  baseURL: string;
}

export class OllamaProvider {
  private baseURL: string;

  constructor(config: OllamaConfig) {
    this.baseURL = config.baseURL;
  }

  createTextModel(modelName: string) {
    const baseURL = this.baseURL;

    return {
      modelId: modelName,
      provider: "ollama",

      async doGenerate(options: {
        prompt: string;
        temperature?: number;
        topP?: number;
        topK?: number;
        tools?: OllamaTool[];
        messages?: OllamaMessage[];
      }): Promise<{ text: string; toolCalls?: OllamaToolCall[] }> {
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
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
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

      async doChatGenerate(options: {
        prompt?: string;
        messages?: OllamaMessage[];
        temperature?: number;
        topP?: number;
        topK?: number;
        tools?: OllamaTool[];
      }): Promise<{ text: string; toolCalls?: OllamaToolCall[] }> {
        // Build messages array
        const messages = options.messages || [
          {
            role: "user" as const,
            content: options.prompt || "",
          },
        ];

        const response = await fetch(`${baseURL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            messages,
            stream: false,
            tools: options.tools,
            options: {
              temperature: options.temperature,
              top_p: options.topP,
              top_k: options.topK,
            },
          } as OllamaChatRequest),
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
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

      async *doStream(options: {
        prompt: string;
        temperature?: number;
        topP?: number;
        topK?: number;
        tools?: OllamaTool[];
      }): AsyncGenerator<string> {
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
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
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
                  console.warn("Failed to parse streaming line:", line);
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

  createEmbeddingsModel(modelName: string) {
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
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as { embedding: number[] };
        return data.embedding;
      },
    };
  }
}
