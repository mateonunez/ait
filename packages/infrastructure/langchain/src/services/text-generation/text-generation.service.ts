import { QdrantVectorStore } from "@langchain/qdrant";
import {
  getLangChainClient,
  DEFAULT_GENERATION_MODEL,
  GENERATION_VECTOR_SIZE,
  DEFAULT_EMBEDDINGS_MODEL,
  EMBEDDINGS_VECTOR_SIZE,
  initLangChainClient,
} from "../../langchain.client";
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
const RETOVE_COLLECTION_NAME = "ait_embeddings_collection";

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
    private readonly _model: string = DEFAULT_GENERATION_MODEL,
    private readonly _embeddingsModel: string = DEFAULT_EMBEDDINGS_MODEL,
    private readonly _expectedVectorSize: number = GENERATION_VECTOR_SIZE,
    private readonly _collectionName: string = RETOVE_COLLECTION_NAME,
    embeddingService?: IEmbeddingsService,
    promptConfig?: PromptConfig,
  ) {
    try {
      this._embeddingService =
        embeddingService ??
        new EmbeddingsService(this._embeddingsModel, EMBEDDINGS_VECTOR_SIZE, { concurrencyLimit: 4 });

      this._embeddingCache = new LRUCache({
        maxSize: 1000,
        ttlMs: 24 * 60 * 60 * 1000, // 24 hours TTL
      });

      const config = promptConfig || {
        systemPrompt: systemPrompt,
        operation: "text-generation",
      };

      this._promptBuilder = new PromptBuilder(config);
    } catch (error) {
      console.error("Failed to initialize TextGenerationService:", error);
      throw new TextGenerationError(
        `Failed to initialize service: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
      initLangChainClient({ model: this._model, temperature: 1 });
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
        embedQuery: async (query: string) => {
          const embeddings = await this._getEmbeddingsWithCache(query, {
            correlationId,
            concurrencyLimit: 4,
          });
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

    const similarDocs = await this._retrieveWithMultiQueries(vectorStore, prompt);

    console.info("Similar documents found", {
      prompt,
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
      const entityId = (doc.metadata?.id as string) || randomUUID();
      entityMap.set(entityId, (entityMap.get(entityId) || "") + doc.pageContent);
      metadataMap.set(entityId, (doc.metadata || {}) as Record<string, unknown>);
    }

    const buildTitle = (meta: Record<string, unknown>): string => {
      const type = (meta.__type as string) || "Document";
      const name = typeof (meta as { name?: unknown }).name === "string" ? (meta as { name?: string }).name : undefined;
      const artist =
        typeof (meta as { artist?: unknown }).artist === "string" ? (meta as { artist?: string }).artist : undefined;
      const title = name && artist ? `${name} — ${artist}` : name;
      const fallback =
        title ||
        (typeof (meta as { title?: unknown }).title === "string" ? (meta as { title?: string }).title : undefined) ||
        (typeof (meta as { description?: unknown }).description === "string"
          ? (meta as { description?: string }).description
          : undefined) ||
        type;
      return `${type} ${fallback}`.trim();
    };

    const contextFromDocuments = Array.from(entityMap.entries())
      .map(([id, content]) => {
        const meta = metadataMap.get(id) || {};
        const header = `## ${buildTitle(meta)}`;
        return `${header}\n${content}`;
      })
      .join("\n\n");

    console.log("Context from documents", contextFromDocuments);

    return contextFromDocuments;
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
    return `${this._embeddingsModel}:${text.trim().toLowerCase()}`;
  }

  private async _planQueriesWithLLM(userPrompt: string): Promise<string[]> {
    const llm = this._getLLM();
    const instruction = [
      "You are a retrieval query planner for AIt's knowledge base populated via 4 Connectors: Spotify, GitHub, X (Twitter), and Linear.",
      "Your goal: generate 12-16 diverse keyword queries to retrieve documents from ALL connectors, ensuring comprehensive coverage.",
      "Required: Generate at least 2-3 queries for EACH connector type to avoid missing data sources.",
      "",
      "CONNECTOR-SPECIFIC GUIDANCE:",
      "- Spotify: Query playlists (name, description, owner), tracks (name, artist, album), artists (name, genres), albums (name, artist, genres, label).",
      "- GitHub: Query repositories (name, description, language, topics, stars, forks).",
      "- X (Twitter): Query tweets (text content, mentions, hashtags, engagement metrics); avoid tweet_id.",
      "- Linear: Query issues (title, description, state, priority, labels, assignee).",
      "",
      "STRATEGY:",
      "1. Identify key concepts from user request (e.g., 'digital footprint' → code, playlists, tweets, issues)",
      "2. Generate 3-4 queries per connector covering different aspects",
      "3. Combine entity names (mateo, user) with connector-specific fields",
      "4. Include temporal hints if present (YYYY-MM-DD format)",
      "5. Avoid IDs/URIs/hashes (spotify:*, commit hashes, tweet IDs)",
      "",
      "FORMAT: Keep queries concise (2-6 words), lowercase, space-separated, no punctuation.",
      "OUTPUT: ONLY a JSON array of 12-16 strings.",
    ].join(" ");

    const composed = `${instruction}\n\nUser Request:\n${userPrompt}`;
    const raw = await llm.invoke(composed);
    const parsed = this._extractJsonArray(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((q) => (typeof q === "string" ? q.trim() : ""))
        .filter((q) => q.length > 0)
        .slice(0, 16);
    }

    return [userPrompt];
  }

  private async _retrieveWithMultiQueries(
    vectorStore: QdrantVectorStore,
    userPrompt: string,
  ): Promise<DocumentInterface<Record<string, unknown>>[]> {
    const queries = await this._planQueriesWithLLM(userPrompt);

    console.log("Queries", queries);

    // Allocate per-query k based on total budget
    const totalBudget = Math.max(10, this._maxSearchSimilarDocs);
    const perQueryK = Math.max(2, Math.floor(totalBudget / Math.max(1, queries.length)));

    type Scored = { doc: DocumentInterface<Record<string, unknown>>; score: number };
    const bestById = new Map<string, Scored>();

    // Prefer withScore API when available
    const vsAny = vectorStore as unknown as {
      similaritySearchWithScore?: (
        query: string,
        k: number,
      ) => Promise<Array<[DocumentInterface<Record<string, unknown>>, number]>>;
      similaritySearch: (query: string, k: number) => Promise<Array<DocumentInterface<Record<string, unknown>>>>;
    };

    let successfulQueries = 0;
    let lastError: Error | undefined;

    for (const q of queries) {
      try {
        if (typeof vsAny.similaritySearchWithScore === "function") {
          const pairs = await vsAny.similaritySearchWithScore(q, perQueryK);
          for (const [doc, score] of pairs) {
            const id = (doc.metadata as { id?: string })?.id || doc.pageContent.slice(0, 80);
            const prev = bestById.get(id);
            if (!prev || score > prev.score) {
              bestById.set(id, { doc, score });
            }
          }
        } else {
          const docs = await vsAny.similaritySearch(q, perQueryK);
          for (const doc of docs) {
            const id = (doc.metadata as { id?: string })?.id || doc.pageContent.slice(0, 80);
            const prev = bestById.get(id);
            const score = prev?.score ?? 0.5; // neutral when unknown
            if (!prev) bestById.set(id, { doc, score });
          }
        }
        successfulQueries++;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.debug("Query variant failed", { query: q, error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (successfulQueries === 0 && lastError) {
      throw lastError;
    }

    const ranked = Array.from(bestById.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, totalBudget)
      .map((s) => s.doc);

    console.debug("Query variants used", { count: queries.length, perQueryK, returned: ranked.length });
    return ranked;
  }

  private _extractJsonArray(text: string): unknown[] | null {
    try {
      const direct = JSON.parse(text);
      return Array.isArray(direct) ? direct : null;
    } catch {}
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {}
    }
    const bracket = text.match(/\[([\s\S]*?)\]/);
    if (bracket) {
      try {
        const parsed = JSON.parse(bracket[0]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {}
    }
    return null;
  }
}
