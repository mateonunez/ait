interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

interface OllamaEmbedRequest {
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
      }): Promise<{ text: string }> {
        const response = await fetch(`${baseURL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            prompt: options.prompt,
            stream: false,
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

        const data = (await response.json()) as { response: string };
        return { text: data.response };
      },

      async *doStream(options: {
        prompt: string;
        temperature?: number;
        topP?: number;
        topK?: number;
      }): AsyncGenerator<string> {
        const response = await fetch(`${baseURL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelName,
            prompt: options.prompt,
            stream: true,
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
