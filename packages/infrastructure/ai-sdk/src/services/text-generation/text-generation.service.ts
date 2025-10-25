import { getAItClient, DEFAULT_RAG_COLLECTION } from "../../client/ai-sdk.client";
import { QdrantProvider } from "../../rag/qdrant.provider";
import { MultiQueryRetrieval } from "../../rag/multi-query.retrieval";
import { ContextBuilder } from "../../rag/context.builder";
import { buildSystemPromptWithContext, buildSystemPromptWithoutContext } from "../prompts/system.prompt";
import { LRUCache } from "../../cache/lru-cache";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import type { Document, BaseMetadata } from "../../types/documents";
import type { ChatMessage } from "../../types/chat";
import { formatConversationHistory } from "../../types/chat";
import { randomUUID } from "node:crypto";
import { convertToOllamaTools } from "../../tools/tool.converter";
import type { OllamaToolCall } from "../../client/ollama.provider";

export interface CoreTool {
  description: string;
  parameters: any;
  execute: (params: any) => Promise<unknown>;
}

export const MAX_SEARCH_SIMILAR_DOCS = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class TextGenerationError extends Error {
  constructor(
    message: string,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = "TextGenerationError";
  }
}

export interface TextGenerationConfig {
  model?: string;
  embeddingsModel?: string;
  collectionName?: string;
  embeddingsService?: IEmbeddingsService;
  multipleQueryPlannerConfig?: {
    maxDocs?: number;
    queriesCount?: number;
    concurrency?: number;
  };
}

export interface GenerateOptions {
  prompt: string;
  tools?: Record<string, CoreTool>;
  maxToolRounds?: number;
  enableRAG?: boolean;
  messages?: ChatMessage[];
}

export interface GenerateStreamOptions {
  prompt: string;
  tools?: Record<string, CoreTool>;
  maxToolRounds?: number;
  enableRAG?: boolean;
  messages?: ChatMessage[];
}

export interface ITextGenerationService {
  generateStream(options: GenerateStreamOptions): AsyncGenerator<string>;
}

export class TextGenerationService implements ITextGenerationService {
  private readonly _qdrantProvider: QdrantProvider;
  private readonly _multiQueryRetrieval: MultiQueryRetrieval;
  private readonly _contextBuilder: ContextBuilder;
  private readonly _embeddingCache: LRUCache<string, number[]>;
  private readonly _embeddingsModel: string;
  private readonly _collectionName: string;
  private readonly _embeddingService: IEmbeddingsService;

  constructor(config: TextGenerationConfig = {}) {
    const client = getAItClient();

    this._embeddingsModel = config.embeddingsModel || client.embeddingModelConfig.name;
    this._collectionName = config.collectionName || DEFAULT_RAG_COLLECTION;

    this._embeddingService =
      config.embeddingsService ||
      new EmbeddingsService(this._embeddingsModel, client.embeddingModelConfig.vectorSize, { concurrencyLimit: 4 });

    this._qdrantProvider = new QdrantProvider({
      collectionName: this._collectionName,
      embeddingsModel: this._embeddingsModel,
      embeddingsService: this._embeddingService,
    });

    this._multiQueryRetrieval = new MultiQueryRetrieval({
      maxDocs: config.multipleQueryPlannerConfig?.maxDocs || 100,
      queriesCount: config.multipleQueryPlannerConfig?.queriesCount || 12,
      concurrency: config.multipleQueryPlannerConfig?.concurrency || 4,
    });

    this._contextBuilder = new ContextBuilder();

    this._embeddingCache = new LRUCache({
      maxSize: 1000,
      ttlMs: 24 * 60 * 60 * 1000,
    });
  }
  public async *generateStream(options: GenerateStreamOptions): AsyncGenerator<string> {
    if (!options.prompt || !options.prompt.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const correlationId = randomUUID();
    const overallStart = Date.now();

    try {
      console.info("Starting stream text generation", { prompt: options.prompt.slice(0, 100) });

      const client = getAItClient();
      const fullPrompt = await this._buildFullPrompt(options, correlationId);

      const ollamaTools = options.tools ? convertToOllamaTools(options.tools) : undefined;
      const maxRounds = options.maxToolRounds || 5;

      let currentPrompt = fullPrompt;
      let hasToolCalls = false;

      for (let round = 0; round < maxRounds; round++) {
        if (options.tools) {
          console.info(`Checking for tool calls (round ${round + 1})...`);

          const messages = this._buildMessages(options, correlationId);

          const checkResult = await this._retryOperation(async () => {
            return await client.generationModel.doGenerate({
              prompt: currentPrompt,
              messages: await messages,
              temperature: client.config.generation.temperature,
              topP: client.config.generation.topP,
              topK: client.config.generation.topK,
              tools: ollamaTools,
            });
          });

          console.info("Tool check result", {
            hasToolCalls: checkResult.toolCalls && checkResult.toolCalls.length > 0,
            toolCallsCount: checkResult.toolCalls?.length || 0,
          });

          if (checkResult.toolCalls && checkResult.toolCalls.length > 0) {
            hasToolCalls = true;

            console.info("Executing tools...", {
              toolNames: checkResult.toolCalls.map((tc) => tc.function.name),
            });
            const toolResults = await this._executeToolCalls(checkResult.toolCalls, options.tools);

            currentPrompt = this._buildPromptWithToolResults(fullPrompt, checkResult.toolCalls, toolResults);

            console.info("Streaming response with tool results...");
            break;
          }
        }
      }

      const stream = await this._retryOperation(async () => {
        return client.generationModel.doStream({
          prompt: currentPrompt,
          temperature: client.config.generation.temperature,
          topP: client.config.generation.topP,
          topK: client.config.generation.topK,
        });
      });

      let chunkCount = 0;
      let fullResponse = "";

      for await (const chunk of stream) {
        chunkCount++;
        fullResponse += chunk;
        yield chunk;
      }

      console.info("Stream generation completed", {
        duration: Date.now() - overallStart,
        hasToolCalls,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Stream generation failed", { error: errMsg, duration: Date.now() - overallStart });
      throw new TextGenerationError(`Failed to generate stream text: ${errMsg}`, correlationId);
    }
  }

  private async _retryOperation<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        const delay = RETRY_DELAY_MS * attempt;
        console.warn(`Operation failed, retrying in ${delay}ms`, {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Retry operation failed unexpectedly");
  }

  private async _buildFullPrompt(
    options: GenerateOptions | GenerateStreamOptions,
    correlationId: string,
  ): Promise<string> {
    let systemMessage: string;

    if (options.enableRAG !== false) {
      const context = await this._prepareContext(options.prompt, correlationId);
      systemMessage = buildSystemPromptWithContext(context);
    } else {
      systemMessage = buildSystemPromptWithoutContext();
    }

    if (!options.messages || options.messages.length === 0) {
      return `${systemMessage}\n\nUser: ${options.prompt}\n\nAssistant:`;
    }

    // Build conversation with proper formatting
    const parts: string[] = [systemMessage];

    // Add conversation history if present
    const formattedHistory = formatConversationHistory(options.messages);
    if (formattedHistory) {
      parts.push(formattedHistory);
    }

    // Add current user message
    parts.push(`User: ${options.prompt}`);

    // Add assistant prompt
    parts.push("Assistant:");

    return parts.join("\n\n");
  }

  private async _buildMessages(
    options: GenerateStreamOptions,
    correlationId: string,
  ): Promise<Array<{ role: string; content: string }>> {
    let systemMessage: string;

    if (options.enableRAG !== false) {
      const context = await this._prepareContext(options.prompt, correlationId);
      systemMessage = buildSystemPromptWithContext(context);
    } else {
      systemMessage = buildSystemPromptWithoutContext();
    }

    const messages: Array<{ role: string; content: string }> = [{ role: "system", content: systemMessage }];

    // Add conversation history if present
    if (options.messages && options.messages.length > 0) {
      for (const msg of options.messages) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({
      role: "user",
      content: options.prompt,
    });

    return messages;
  }

  private async _prepareContext(prompt: string, correlationId: string): Promise<string> {
    console.info("Preparing context for RAG");

    const similarDocs = await this._multiQueryRetrieval.retrieveWithMultiQueries(this._qdrantProvider, prompt);
    const context = this._contextBuilder.buildContextFromDocuments(similarDocs as Document<BaseMetadata>[]);

    return context;
  }

  private async _executeToolCalls(
    toolCalls: OllamaToolCall[],
    tools: Record<string, CoreTool>,
  ): Promise<Array<{ name: string; result: unknown; error?: string }>> {
    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const toolName = toolCall.function.name;
        const tool = tools[toolName];

        if (!tool) {
          console.warn(`Tool ${toolName} not found`);
          return {
            name: toolName,
            result: null,
            error: `Tool ${toolName} not found`,
          };
        }

        try {
          console.info(`Executing tool: ${toolName}`, { arguments: toolCall.function.arguments });
          const result = await tool.execute(toolCall.function.arguments);
          console.info(`Tool ${toolName} completed`, { result });
          return {
            name: toolName,
            result,
          };
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`Tool ${toolName} failed`, { error: errMsg });
          return {
            name: toolName,
            result: null,
            error: errMsg,
          };
        }
      }),
    );

    return results;
  }

  private _buildPromptWithToolResults(
    originalPrompt: string,
    toolCalls: OllamaToolCall[],
    toolResults: Array<{ name: string; result: unknown; error?: string }>,
  ): string {
    let prompt = originalPrompt;

    prompt += "\n\n=== Tool Call Results ===\n";

    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i];
      const result = toolResults[i];

      prompt += `\nTool: ${toolCall.function.name}\n`;
      prompt += `Arguments: ${JSON.stringify(toolCall.function.arguments, null, 2)}\n`;

      if (result.error) {
        prompt += `Error: ${result.error}\n`;
      } else {
        prompt += `Result: ${JSON.stringify(result.result, null, 2)}\n`;
      }
    }

    prompt += "\n=== End Tool Results ===\n\n";
    prompt += "Based on the tool results above, please provide your final response to the user's query.";

    return prompt;
  }
}
