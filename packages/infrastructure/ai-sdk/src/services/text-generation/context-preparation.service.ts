import type { RAGContext, ContextPreparationConfig } from "../../types/text-generation";
import type { Document, BaseMetadata } from "../../types/documents";
import type { IMultiQueryRetrievalService } from "../rag/multi-query-retrieval.service";
import type { QdrantProvider } from "../rag/qdrant.provider";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import { ContextBuilder } from "../rag/context.builder";
import { TemporalCorrelationService, type ITemporalCorrelationService } from "../rag/temporal-correlation.service";

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
  private readonly _temporalCorrelation: ITemporalCorrelationService;
  private readonly _cacheDurationMs: number;
  private readonly _topicSimilarityThreshold: number;
  private readonly _temporalWindowHours: number;

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
    this._temporalCorrelation = new TemporalCorrelationService(config.temporalWindowHours ?? 3);

    this._cacheDurationMs = Math.max(config.cacheDurationMs ?? 5 * 60 * 1000, 0);
    this._topicSimilarityThreshold = Math.max(Math.min(config.topicSimilarityThreshold ?? 0.7, 1), 0);
    this._temporalWindowHours = config.temporalWindowHours ?? 3;
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
    let documents: Document<BaseMetadata>[] = [];
    let fallbackUsed = false;
    let fallbackReason: string | undefined;

    try {
      documents = await this._multiQueryRetrieval.retrieve<BaseMetadata>(this._vectorStore, query);
    } catch (error) {
      fallbackUsed = true;
      fallbackReason = error instanceof Error ? error.message : String(error);
      console.error("RAG retrieval failed, returning fallback context", {
        error: fallbackReason,
      });
    }

    let context = "";
    let usedTemporalCorrelation = false;

    if (documents.length > 0) {
      // Check if this query has temporal intent (from LLM analysis)
      const hasTemporalIntent = documents.some((doc) => {
        // Documents might carry intent information from the query plan
        // For now, we'll use a heuristic: if multiple entity types with timestamps exist, apply temporal correlation
        return doc.metadata.createdAt || doc.metadata.playedAt || doc.metadata.mergedAt || doc.metadata.pushedAt;
      });

      // Apply temporal correlation for queries with multiple entity types that have timestamps
      const entityTypes = new Set(documents.map((doc) => doc.metadata.__type).filter(Boolean));
      const shouldApplyTemporal = hasTemporalIntent && entityTypes.size > 1;

      if (shouldApplyTemporal) {
        console.info("Temporal correlation applicable, grouping by time windows", {
          documentCount: documents.length,
          entityTypes: Array.from(entityTypes),
          windowHours: this._temporalWindowHours,
        });

        const clusters = this._temporalCorrelation.correlateByTimeWindow(documents, this._temporalWindowHours);

        if (clusters.length > 0) {
          context = this._contextBuilder.buildTemporalContext(clusters);
          usedTemporalCorrelation = true;
          console.info("Temporal context built", {
            clusterCount: clusters.length,
            contextLength: context.length,
          });
        } else {
          // Fallback to regular context if temporal correlation yields no results
          console.warn("Temporal correlation yielded no results, using regular context");
          context = this._contextBuilder.buildContextFromDocuments(documents);
        }
      } else {
        context = this._contextBuilder.buildContextFromDocuments(documents);
      }
    }

    const ragContext: RAGContext = {
      context,
      documents,
      timestamp: Date.now(),
      query,
      fallbackUsed,
      fallbackReason,
    };

    if (!fallbackUsed) {
      this._cachedContext = ragContext;
    } else {
      this._cachedContext = null;
    }

    console.info(fallbackUsed ? "RAG fallback context prepared" : "RAG context prepared", {
      documentCount: documents.length,
      contextLength: context.length,
      retrievalTimeMs: Date.now() - startTime,
      fallbackUsed,
      fallbackReason,
      usedTemporalCorrelation,
    });

    return ragContext;
  }

  clearCache(): void {
    this._cachedContext = null;
  }

  private async _canReuseCachedContext(query: string): Promise<boolean> {
    if (!this._cachedContext || this._cachedContext.fallbackUsed) {
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

      console.info("Topic similarity check", {
        similarity: similarity.toFixed(3),
        threshold: this._topicSimilarityThreshold,
        willReuseCache: similarity >= this._topicSimilarityThreshold,
        previousQuery: this._cachedContext.query.slice(0, 50),
        currentQuery: query.slice(0, 50),
      });

      if (similarity < this._topicSimilarityThreshold) {
        console.info("Topic changed significantly - fetching fresh context");
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
