import { getAItClient, DEFAULT_RAG_COLLECTION } from "../../client/ai-sdk.client";
import { QdrantProvider } from "../../rag/qdrant.provider";
import { MultiQueryRetrieval } from "../../rag/multi-query.retrieval";
import { ContextBuilder } from "../../rag/context.builder";
import { systemPrompt, buildSystemPromptWithContext } from "../prompts/system.prompt";
import { LRUCache } from "../../cache/lru-cache";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import type { Document, BaseMetadata } from "../../types/documents";
import { randomUUID } from "node:crypto";

export interface CoreTool {
  description: string;
  parameters: Record<string, unknown>;
  execute: (...args: unknown[]) => Promise<unknown>;
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
  maxSearchDocs?: number;
  embeddingsService?: IEmbeddingsService;
}

export interface GenerateOptions {
  prompt: string;
  tools?: Record<string, CoreTool>;
  maxToolRounds?: number;
  enableRAG?: boolean;
}

export interface GenerateStreamOptions {
  prompt: string;
  tools?: Record<string, CoreTool>;
  enableRAG?: boolean;
}

export interface ITextGenerationService {
  generate(options: GenerateOptions): Promise<{ text: string; toolCalls?: unknown[]; finishReason: string }>;
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
      maxDocs: config.maxSearchDocs || MAX_SEARCH_SIMILAR_DOCS,
    });

    this._contextBuilder = new ContextBuilder();

    this._embeddingCache = new LRUCache({
      maxSize: 1000,
      ttlMs: 24 * 60 * 60 * 1000,
    });
  }

  public async generate(
    options: GenerateOptions,
  ): Promise<{ text: string; toolCalls?: unknown[]; finishReason: string }> {
    if (!options.prompt || !options.prompt.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const correlationId = randomUUID();
    const overallStart = Date.now();

    try {
      console.info("Starting text generation", { prompt: options.prompt.slice(0, 100) });

      const client = getAItClient();
      let systemMessage = systemPrompt;

      if (options.enableRAG !== false) {
        const context = await this._prepareContext(options.prompt, correlationId);
        systemMessage = buildSystemPromptWithContext(context, options.prompt);
      }

      const fullPrompt = `${systemMessage}\n\nUser: ${options.prompt}`;

      const result = await this._retryOperation(async () => {
        const text = await client.generationModel.doGenerate({
          prompt: fullPrompt,
          temperature: client.config.generation.temperature,
          topP: client.config.generation.topP,
          topK: client.config.generation.topK,
        });

        return {
          text: text.text,
          toolCalls: [],
          finishReason: "stop",
        };
      });

      const duration = Date.now() - overallStart;
      console.info("Text generation completed", {
        duration,
        outputLength: result.text.length,
      });

      return {
        text: result.text,
        toolCalls: result.toolCalls as unknown[],
        finishReason: result.finishReason,
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Text generation failed", { error: errMsg, duration: Date.now() - overallStart });
      throw new TextGenerationError(`Failed to generate text: ${errMsg}`, correlationId);
    }
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
      let systemMessage = systemPrompt;

      if (options.enableRAG !== false) {
        const context = await this._prepareContext(options.prompt, correlationId);
        systemMessage = buildSystemPromptWithContext(context, options.prompt);
      }

      const fullPrompt = `${systemMessage}\n\nUser: ${options.prompt}`;

      const stream = await this._retryOperation(async () => {
        return client.generationModel.doStream({
          prompt: fullPrompt,
          temperature: client.config.generation.temperature,
          topP: client.config.generation.topP,
          topK: client.config.generation.topK,
        });
      });

      let chunkCount = 0;
      for await (const chunk of stream) {
        chunkCount++;
        yield chunk;
      }

      console.info("Stream generation completed", {
        duration: Date.now() - overallStart,
        chunkCount,
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

  private async _prepareContext(prompt: string, correlationId: string): Promise<string> {
    console.info("Preparing context for RAG");

    const similarDocs = await this._multiQueryRetrieval.retrieveWithMultiQueries(this._qdrantProvider, prompt);

    console.info("Similar documents found", {
      prompt,
      count: similarDocs.length,
    });

    const context = this._contextBuilder.buildContextFromDocuments(similarDocs as Document<BaseMetadata>[]);
    console.debug("Context built", {
      contextLength: context.length,
    });

    return context;
  }
}
