import { QdrantVectorStore } from "@langchain/qdrant";
import { getLangChainClient, DEFAULT_LANGCHAIN_MODEL, LANGCHAIN_VECTOR_SIZE } from "../../langchain.client";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import type { Ollama } from "@langchain/ollama";
import { randomUUID } from "node:crypto";
import type { DocumentInterface } from "@langchain/core/documents";
import { LRUCache } from "../cache/lru-cache";
import { PromptBuilder } from "../prompts/prompt.builder";
import type { PromptConfig } from "../prompts/prompt.types";
import { systemPrompt } from "../prompts/system.prompt";

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

interface Document extends DocumentInterface<Record<string, unknown>> {
  pageContent: string;
  metadata: {
    id: string;
    __type: string;
    [key: string]: unknown;
  };
}

export interface ITextGenerationService {
  generateText(prompt: string): Promise<string>;
  generateTextStream(prompt: string): AsyncGenerator<string>;
}

export class TextGenerationService implements ITextGenerationService {
  private readonly _embeddingService: IEmbeddingsService;
  private readonly _maxSearchSimilarDocs = MAX_SEARCH_SIMILAR_DOCS;
  private readonly _embeddingCache: LRUCache<string, number[]>;
  private readonly _promptBuilder: PromptBuilder;
  private _llmInstance: Ollama | undefined;

  constructor(
    private readonly _model: string = DEFAULT_LANGCHAIN_MODEL,
    private readonly _expectedVectorSize: number = LANGCHAIN_VECTOR_SIZE,
    private readonly _collectionName: string = "langchain",
    embeddingService?: IEmbeddingsService,
    promptConfig?: PromptConfig,
  ) {
    this._embeddingService =
      embeddingService ?? new EmbeddingsService(this._model, this._expectedVectorSize, { concurrencyLimit: 4 });

    this._embeddingCache = new LRUCache({
      maxSize: 1000,
      ttlMs: 24 * 60 * 60 * 1000, // 24 hours TTL
    });

    const config = promptConfig || {
      systemPrompt: systemPrompt,
      operation: "text-generation",
      chainOfThought: true,
    };

    this._promptBuilder = new PromptBuilder(config);
  }

  public async generateText(prompt: string): Promise<string> {
    if (!prompt || !prompt.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const correlationId = randomUUID();
    const overallStart = Date.now();

    try {
      console.info("Starting text generation", { prompt: prompt.slice(0, 100) });

      const { context, prompt: preparedPrompt } = await this._prepareChainInput(
        prompt,
        "text generation",
        correlationId,
      );

      if (!preparedPrompt || !preparedPrompt.trim()) {
        throw new TextGenerationError("Prompt cannot be empty after preparation", correlationId);
      }

      console.debug("Context and prompt prepared", {
        contextLength: context.length,
        preparedPromptLength: preparedPrompt.length,
      });

      const llm = this._getLLM();
      const promptTemplate = await this._promptBuilder.build("text-generation", context, preparedPrompt);
      const formattedPrompt = await promptTemplate.format({ context, prompt: preparedPrompt });

      if (!formattedPrompt || !formattedPrompt.trim()) {
        throw new TextGenerationError("Formatted prompt cannot be empty", correlationId);
      }

      console.debug("Prompt formatted", { promptLength: formattedPrompt.length });

      const generatedText = await this._retryOperation(() => llm.invoke(formattedPrompt));

      const duration = Date.now() - overallStart;
      console.info("Text generation completed", {
        duration,
        outputLength: generatedText.length,
      });

      return generatedText;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Text generation failed", { error: errMsg, duration: Date.now() - overallStart });
      throw new TextGenerationError(`Failed to generate text: ${errMsg}`, correlationId);
    }
  }

  public async *generateTextStream(prompt: string): AsyncGenerator<string> {
    if (!prompt || !prompt.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const correlationId = randomUUID();
    const overallStart = Date.now();

    try {
      console.info("Starting stream text generation", { prompt: prompt.slice(0, 100) });

      const { context, prompt: preparedPrompt } = await this._prepareChainInput(
        prompt,
        "stream text generation",
        correlationId,
      );

      if (!preparedPrompt || !preparedPrompt.trim()) {
        throw new TextGenerationError("Prompt cannot be empty after preparation", correlationId);
      }

      const llm = this._getLLM();
      const promptTemplate = await this._promptBuilder.build("streaming", context, preparedPrompt);
      const formattedPrompt = await promptTemplate.format({ context, prompt: preparedPrompt });

      if (!formattedPrompt || !formattedPrompt.trim()) {
        throw new TextGenerationError("Formatted prompt cannot be empty", correlationId);
      }

      console.debug("Starting stream", { promptLength: formattedPrompt.length });

      const stream = await this._retryOperation(() => llm.stream(formattedPrompt));

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

  private _getLLM(): Ollama {
    if (!this._llmInstance) {
      const langChainClient = getLangChainClient();
      this._llmInstance = langChainClient.createLLM(this._model);
    }
    return this._llmInstance;
  }

  private async _prepareChainInput(
    prompt: string,
    operation: string,
    correlationId: string,
  ): Promise<{ context: string; prompt: string }> {
    console.info(`Preparing chain input for ${operation}`);

    const embedStart = Date.now();

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      {
        embedQuery: async () => {
          const embeddings = await this._embeddingService.generateEmbeddings(prompt, {
            correlationId,
            concurrencyLimit: 4,
          });
          console.debug("Query embeddings generated", { duration: Date.now() - embedStart });
          return embeddings;
        },
        embedDocuments: async (documents: string[]) => {
          const batchSize = 10;
          const results: number[][] = [];

          for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const batchStart = Date.now();

            const batchResults = await Promise.all(
              batch.map((doc) =>
                this._getEmbeddingsWithCache(doc, {
                  correlationId: `${correlationId}-batch-${i}`,
                  concurrencyLimit: 2,
                }),
              ),
            );

            console.debug(`Batch ${Math.floor(i / batchSize) + 1} processed`, {
              duration: Date.now() - batchStart,
            });

            results.push(...batchResults);
          }
          return results;
        },
      },
      {
        url: process.env.QDRANT_URL,
        collectionName: this._collectionName,
      },
    );

    const similarityStart = Date.now();
    const similarDocs = await vectorStore.similaritySearch(prompt, this._maxSearchSimilarDocs);
    console.info("Similar documents found", {
      count: similarDocs.length,
      duration: Date.now() - similarityStart,
    });

    const context = this._buildContextFromDocuments(similarDocs as Document[]);
    console.debug("Context built", {
      contextLength: context.length,
    });

    return { context, prompt };
  }

  private _buildContextFromDocuments(documents: Document[]): string {
    const entityMap = new Map<string, string>();
    const metadataMap = new Map<string, Record<string, unknown>>();

    for (const doc of documents) {
      const entityId = doc.metadata?.id! as string;
      if (entityId) {
        entityMap.set(entityId, (entityMap.get(entityId) || "") + doc.pageContent);
        metadataMap.set(entityId, doc.metadata || {});
      }
    }

    return Array.from(entityMap.entries())
      .map(([id, content]) => `## ${metadataMap.get(id)?.__type || "Document"} ${id}\n${content}`)
      .join("\n\n");
  }

  private async _getEmbeddingsWithCache(
    text: string,
    options: { correlationId: string; concurrencyLimit?: number },
  ): Promise<number[]> {
    const cacheKey = this._generateCacheKey(text);
    const cachedEmbeddings = this._embeddingCache.get(cacheKey);

    if (cachedEmbeddings) {
      console.debug("Cache hit for embeddings", {
        correlationId: options.correlationId,
        cacheKey: cacheKey.slice(0, 30),
      });
      return cachedEmbeddings;
    }

    const embeddings = await this._embeddingService.generateEmbeddings(text, options);
    this._embeddingCache.set(cacheKey, embeddings);

    return embeddings;
  }

  private _generateCacheKey(text: string): string {
    return `${this._model}:${text.trim().toLowerCase()}`;
  }
}
