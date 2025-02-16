import { QdrantVectorStore } from "@langchain/qdrant";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getLangChainClient, DEFAULT_LANGCHAIN_MODEL, LANGCHAIN_VECTOR_SIZE } from "../../langchain.client";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import type { Ollama } from "@langchain/ollama";
import { randomUUID, createHash } from "node:crypto";
import type { DocumentInterface } from "@langchain/core/documents";

export const MAX_SEARCH_SIMILAR_DOCS = 100;

export class TextGenerationError extends Error {
  constructor(message: string) {
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
  private readonly _embeddingCache: Map<string, number[]> = new Map();
  private _llmInstance: Ollama | undefined;

  constructor(
    private readonly _model: string = DEFAULT_LANGCHAIN_MODEL,
    private readonly _expectedVectorSize: number = LANGCHAIN_VECTOR_SIZE,
    private readonly _collectionName: string = "langchain",
    embeddingService?: IEmbeddingsService,
  ) {
    this._embeddingService =
      embeddingService ?? new EmbeddingsService(this._model, this._expectedVectorSize, { concurrencyLimit: 4 });
  }

  public async generateText(prompt: string): Promise<string> {
    if (!prompt || !prompt.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const overallStart = Date.now();
    try {
      const { context, prompt: preparedPrompt } = await this._prepareChainInput(prompt, "text generation");

      if (!preparedPrompt || !preparedPrompt.trim()) {
        throw new TextGenerationError("Prompt cannot be empty after preparation");
      }

      console.debug("Context:", context);
      console.debug("Prepared prompt:", preparedPrompt);

      const llm = this._getLLM();
      const promptTemplate = this._getPromptTemplate(preparedPrompt, context);
      const formattedPrompt = await promptTemplate.format({ context, prompt: preparedPrompt });

      if (!formattedPrompt || !formattedPrompt.trim()) {
        throw new TextGenerationError("Formatted prompt cannot be empty");
      }

      console.debug("Formatted prompt:", formattedPrompt);
      console.info("Invoking LLM in non-streaming mode...");
      const generatedText = await llm.invoke(formattedPrompt);
      console.info(`Text generation completed in ${Date.now() - overallStart}ms`);
      console.debug("Generated text:", generatedText);

      return generatedText;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Text generation failed", { error: errMsg, prompt });
      throw new TextGenerationError(`Failed to generate text: ${errMsg}`);
    }
  }

  public async *generateTextStream(prompt: string): AsyncGenerator<string> {
    if (!prompt || !prompt.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const overallStart = Date.now();
    try {
      console.info("Starting stream text generation for prompt:", prompt);
      const { context, prompt: preparedPrompt } = await this._prepareChainInput(prompt, "stream text generation");

      if (!preparedPrompt || !preparedPrompt.trim()) {
        throw new TextGenerationError("Prompt cannot be empty after preparation");
      }

      const llm = this._getLLM();
      const promptTemplate = this._getPromptTemplate(preparedPrompt, context);
      const formattedPrompt = await promptTemplate.format({ context, prompt: preparedPrompt });

      if (!formattedPrompt || !formattedPrompt.trim()) {
        throw new TextGenerationError("Formatted prompt cannot be empty");
      }

      console.debug("Formatted prompt for streaming:", formattedPrompt);
      console.info("Invoking LLM in streaming mode...");
      const stream = await llm.stream(formattedPrompt);

      for await (const chunk of stream) {
        yield chunk;
      }

      console.info(`Stream text generation completed in ${Date.now() - overallStart}ms`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Stream generation error:", errMsg);
      throw new TextGenerationError(`Failed to generate stream text: ${errMsg}`);
    }
  }

  private _getPromptTemplate(prompt: string, context: string): ChatPromptTemplate {
    const systemMessage = `
  You are a structured data analysis specialist with access to validated knowledge bases. Follow these strict protocols for analysis, validation, and formatting.
  
  ROLE AND CAPABILITIES:
  - You analyze and interpret structured data from multiple sources
  - You understand and validate against JSON schemas
  - You can identify relationships between different data entities
  - You provide precise, data-driven responses
  
  AVAILABLE DATA TYPES:
  - Spotify: albums, artists, tracks, playlists
  - GitHub: repositories, metrics
  - X: tweets, engagement metrics
  
  CONTEXT INTERPRETATION RULES:
  1. Each section starts with "## [Type] [ID]"
  2. Data is formatted as escaped JSON ({{ and }})
  3. Metadata includes __type field for entity identification
  4. All timestamps are in ISO format
  5. Numeric values should maintain precision
  
  CONTEXT:
  ${context}
  
  RESPONSE GUIDELINES:
  1. Always validate data against known schemas
  2. Preserve relationships between entities
  3. Maintain data type consistency
  4. Include relevant metrics when available
  5. Format responses to match source data structure
  6. Cite specific entity IDs when referencing data
  7. Handle missing or null values gracefully
  `;

    return ChatPromptTemplate.fromMessages([
      ["system", systemMessage.trim()],
      ["user", prompt],
    ]);
  }

  private _buildContextFromDocuments(documents: Document[]): string {
    const entityMap = new Map<string, string>();

    for (const doc of documents) {
      const entityId = doc.metadata?.id! as string;
      if (entityId) {
        entityMap.set(entityId, (entityMap.get(entityId) || "") + doc.pageContent);
      }
    }

    return Array.from(entityMap.entries())
      .map(([id, content]) => `## Album ${id}\n${content}`)
      .join("\n\n");
  }

  private _getLLM(): Ollama {
    if (!this._llmInstance) {
      const langChainClient = getLangChainClient();
      this._llmInstance = langChainClient.createLLM(this._model);
    }
    return this._llmInstance;
  }

  /**
   * Prepares input for the chain by generating embeddings, initializing the vector store,
   * performing similarity search, and building a context string.
   */
  private async _prepareChainInput(prompt: string, operation: string): Promise<{ context: string; prompt: string }> {
    console.info(`Starting ${operation} (prompt preview: "${prompt.slice(0, 50)}...")`);
    const embedStart = Date.now();
    const correlationId = randomUUID();

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      {
        embedQuery: async () => {
          const embeddings = await this._embeddingService.generateEmbeddings(prompt, {
            correlationId,
            concurrencyLimit: 4,
          });
          console.debug(`Prompt embeddings generated in ${Date.now() - embedStart}ms`);
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

            console.debug(`Batch ${Math.floor(i / batchSize) + 1} processed in ${Date.now() - batchStart}ms`);
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

    console.debug("Vector store initialized");

    const similarityStart = Date.now();
    const similarDocs = await vectorStore.similaritySearch(prompt, this._maxSearchSimilarDocs);
    console.info(`Found ${similarDocs.length} similar documents in ${Date.now() - similarityStart}ms`);

    const context = this._buildContextFromDocuments(similarDocs as Document[]);
    console.debug(`Context length: ${context.length}`);
    console.debug(`Context preview: ${context.slice(0, 100)}...`);

    return { context, prompt };
  }

  private async _getEmbeddingsWithCache(
    text: string,
    options: { correlationId: string; concurrencyLimit?: number },
  ): Promise<number[]> {
    const cacheKey = this._generateCacheKey(text);
    if (this._embeddingCache.has(cacheKey)) {
      console.debug(`Cache hit for embedding: ${cacheKey.slice(0, 30)}...`);
      return this._embeddingCache.get(cacheKey)!;
    }

    const embeddings = await this._embeddingService.generateEmbeddings(text, options);
    this._embeddingCache.set(cacheKey, embeddings);

    // Purge oldest entry if cache exceeds maximum size.
    if (this._embeddingCache.size > 1000) {
      const oldestKey = this._embeddingCache.keys().next().value;
      if (oldestKey) {
        this._embeddingCache.delete(oldestKey);
      }
    }

    return embeddings;
  }

  private _generateCacheKey(text: string): string {
    return createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
  }
}
