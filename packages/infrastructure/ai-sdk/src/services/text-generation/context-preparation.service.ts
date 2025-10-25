import type { RAGContext, ContextPreparationConfig } from "../../types/text-generation";
import type { Document, BaseMetadata } from "../../types/documents";
import type { IMultiQueryRetrievalService } from "../rag/multi-query-retrieval.service";
import type { QdrantProvider } from "../../rag/qdrant.provider";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import { ContextBuilder } from "../../rag/context.builder";

/**
 * Interface for context preparation service
 */
export interface IContextPreparationService {
  /**
   * Prepare context for a query with smart caching
   * @param query - User query
   * @returns RAG context
   */
  prepareContext(query: string): Promise<RAGContext>;

  /**
   * Clear cached context
   */
  clearCache(): void;
}

/**
 * Service for preparing RAG context with smart caching
 */
export class ContextPreparationService implements IContextPreparationService {
  private readonly _vectorStore: QdrantProvider;
  private readonly _multiQueryRetrieval: IMultiQueryRetrievalService;
  private readonly _contextBuilder: ContextBuilder;
  private readonly _embeddingsService: IEmbeddingsService;
  private readonly _cacheDurationMs: number;
  private readonly _topicSimilarityThreshold: number;

  private _cachedContext: RAGContext | null = null;

  constructor(
    vectorStore: QdrantProvider,
    multiQueryRetrieval: IMultiQueryRetrievalService,
    embeddingsService: IEmbeddingsService,
    config: ContextPreparationConfig = {},
  ) {
    this._vectorStore = vectorStore;
    this._multiQueryRetrieval = multiQueryRetrieval;
    this._embeddingsService = embeddingsService;
    this._contextBuilder = new ContextBuilder();

    this._cacheDurationMs = Math.max(config.cacheDurationMs ?? 5 * 60 * 1000, 0);
    this._topicSimilarityThreshold = Math.max(Math.min(config.topicSimilarityThreshold ?? 0.7, 1), 0);
  }

  async prepareContext(query: string): Promise<RAGContext> {
    console.info("Preparing context for RAG", { query: query.slice(0, 50) });

    // Check if we can reuse cached context
    if (await this._canReuseCachedContext(query)) {
      console.info("Reusing cached RAG context", {
        age: Date.now() - this._cachedContext!.timestamp,
      });
      return this._cachedContext!;
    }

    // Retrieve fresh context
    const startTime = Date.now();
    const documents = await this._multiQueryRetrieval.retrieve<BaseMetadata>(this._vectorStore, query);

    const context = this._contextBuilder.buildContextFromDocuments(documents as Document<BaseMetadata>[]);

    const ragContext: RAGContext = {
      context,
      documents: documents as Document<BaseMetadata>[],
      timestamp: Date.now(),
      query,
    };

    this._cachedContext = ragContext;

    console.info("RAG context prepared", {
      documentCount: documents.length,
      contextLength: context.length,
      retrievalTimeMs: Date.now() - startTime,
    });

    return ragContext;
  }

  clearCache(): void {
    this._cachedContext = null;
  }

  private async _canReuseCachedContext(query: string): Promise<boolean> {
    if (!this._cachedContext) {
      return false;
    }

    // Check if cache is expired
    const age = Date.now() - this._cachedContext.timestamp;
    if (age > this._cacheDurationMs) {
      console.info("Cache expired", { age, maxAge: this._cacheDurationMs });
      return false;
    }

    // Check topic similarity
    try {
      const similarity = await this._calculateTopicSimilarity(query, this._cachedContext.query);

      if (similarity < this._topicSimilarityThreshold) {
        console.info("Topic changed significantly", { similarity, threshold: this._topicSimilarityThreshold });
        return false;
      }

      return true;
    } catch (error) {
      console.warn("Failed to calculate topic similarity, fetching fresh context", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private async _calculateTopicSimilarity(query1: string, query2: string): Promise<number> {
    const [embedding1, embedding2] = await Promise.all([
      this._embeddingsService.generateEmbeddings(query1),
      this._embeddingsService.generateEmbeddings(query2),
    ]);

    return this._cosineSimilarity(embedding1, embedding2);
  }

  private _cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}
