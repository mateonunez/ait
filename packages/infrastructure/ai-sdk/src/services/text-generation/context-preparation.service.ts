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
  private readonly _maxCacheEntries: number;
  private readonly _maxContextChars: number;

  private _contextCache: Map<string, RAGContext> = new Map();

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
    this._maxCacheEntries = Math.min(Math.max((config as any).maxCacheEntries ?? 16, 1), 128);
    this._maxContextChars = Math.min(Math.max((config as any).maxContextChars ?? 18000, 2000), 120000);
  }

  async prepareContext(query: string): Promise<RAGContext> {
    console.info("Preparing context for RAG", { query: query.slice(0, 50) });

    // Check LRU cache first
    const cached = this._getFromCache(query);
    if (cached) {
      console.info("Reusing cached RAG context", { age: Date.now() - cached.timestamp });
      return cached;
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
          windowHours: this._inferWindowHours(query) ?? this._temporalWindowHours,
        });

        const effectiveWindow = this._inferWindowHours(query) ?? this._temporalWindowHours;
        const clusters = this._temporalCorrelation.correlateByTimeWindow(documents, effectiveWindow);

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

    // Enforce context size budget
    if (context.length > this._maxContextChars) {
      const cut = context.lastIndexOf("\n", this._maxContextChars);
      context = context.slice(0, cut > 0 ? cut : this._maxContextChars);
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
      this._putInCache(query, ragContext);
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
    this._contextCache.clear();
  }

  private _getFromCache(query: string): RAGContext | null {
    const key = this._buildCacheKey(query);
    const entry = this._contextCache.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    if (age > this._cacheDurationMs) {
      this._contextCache.delete(key);
      console.info("Cache expired", { age, maxAge: this._cacheDurationMs });
      return null;
    }
    // Touch LRU: reinsert
    this._contextCache.delete(key);
    this._contextCache.set(key, entry);
    return entry;
  }

  private _putInCache(query: string, value: RAGContext): void {
    const key = this._buildCacheKey(query);
    this._contextCache.set(key, value);
    // Evict LRU if over capacity
    if (this._contextCache.size > this._maxCacheEntries) {
      const oldestKey = this._contextCache.keys().next().value as string | undefined;
      if (oldestKey) this._contextCache.delete(oldestKey);
    }
  }

  private _buildCacheKey(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, " ");
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

  private _inferWindowHours(query: string): number | undefined {
    const q = query.toLowerCase();
    // Heuristic mappings
    if (q.includes("last 24 hours") || q.includes("past 24 hours")) return 6;
    if (q.includes("last 48 hours") || q.includes("past 48 hours")) return 8;
    if (q.includes("last few days") || q.includes("past few days")) return 24;
    if (q.includes("last 3 days") || q.includes("past 3 days")) return 12;
    if (q.includes("last week") || q.includes("past week") || q.includes("last 7 days")) return 24;
    if (q.includes("yesterday")) return 6;
    if (q.includes("today")) return 3;

    // Optional: try chrono-node if available to compute span
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const chrono = require("chrono-node");
      const results = chrono.parse(query);
      if (results && results.length > 0) {
        const r = results[0];
        const from = r.start?.date();
        const to = r.end?.date() || new Date();
        if (from && to) {
          const spanHours = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 3600000));
          // window should be smaller than span to find local correlations
          return Math.min(24, Math.max(2, Math.ceil(spanHours / 8)));
        }
      }
    } catch {
      // chrono-node optional
    }

    return undefined;
  }
}
