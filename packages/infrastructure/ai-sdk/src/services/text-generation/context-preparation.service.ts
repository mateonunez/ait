import { AItError, getLogger } from "@ait/core";
import type { RAGContext, ContextPreparationConfig } from "../../types/text-generation";
import type { Document, BaseMetadata } from "../../types/documents";
import type { IMultiQueryRetrievalService } from "../retrieval/multi-query-retrieval.service";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import { ContextBuilder } from "../context/context.builder";
import {
  TemporalCorrelationService,
  type ITemporalCorrelationService,
} from "../filtering/temporal-correlation.service";
import { recordSpan } from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";
import { getCacheAnalyticsService } from "../analytics/cache-analytics.service";
import type { MultiCollectionProvider } from "../rag/multi-collection.provider";
import type { ICollectionRouterService } from "../routing/collection-router.service";

const logger = getLogger();

export interface IContextPreparationService {
  prepareContext(query: string, traceContext?: TraceContext | null): Promise<RAGContext>;
  clearCache(): void;
}

export class ContextPreparationService implements IContextPreparationService {
  private readonly _multiCollectionProvider: MultiCollectionProvider;
  private readonly _collectionRouter: ICollectionRouterService;
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
    multiCollectionProvider: MultiCollectionProvider,
    collectionRouter: ICollectionRouterService,
    multiQueryRetrieval: IMultiQueryRetrievalService,
    embeddingsService: IEmbeddingsService,
    config: ContextPreparationConfig = {},
  ) {
    this._multiCollectionProvider = multiCollectionProvider;
    this._collectionRouter = collectionRouter;
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

  async prepareContext(query: string, traceContext?: TraceContext | null): Promise<RAGContext> {
    const startTime = Date.now();
    // Check LRU cache first
    const cached = this._getFromCache(query);
    if (cached) {
      const cacheLatency = Date.now() - startTime;
      // Track cache hit for analytics
      const cacheAnalytics = getCacheAnalyticsService();
      cacheAnalytics.recordCacheHit(query, cacheLatency, cached.documents.length);

      if (traceContext) {
        recordSpan(
          "rag-cache-hit",
          "rag",
          traceContext,
          { query: query.slice(0, 100) },
          {
            cached: true,
            cacheAge: Date.now() - cached.timestamp,
            documentCount: cached.documents.length,
          },
        );
      }

      return cached;
    }

    // Retrieve fresh context with multi-collection support
    let documents: Document<BaseMetadata>[] = [];
    let fallbackUsed = false;
    let fallbackReason: string | undefined;

    const retrievalStart = Date.now();
    try {
      // Step 1: Route to appropriate collections based on query
      const routingResult = await this._collectionRouter.routeCollections(query, undefined, traceContext || undefined);

      // Step 2: Execute multi-collection search
      const multiCollectionResults = await this._multiQueryRetrieval.retrieveAcrossCollections<BaseMetadata>(
        this._multiCollectionProvider,
        routingResult.selectedCollections,
        query,
        traceContext,
      );

      documents = multiCollectionResults;

      // Track cache miss with actual retrieval time
      const retrievalLatency = Date.now() - retrievalStart;
      const cacheAnalytics = getCacheAnalyticsService();
      cacheAnalytics.recordCacheMiss(query, retrievalLatency);
    } catch (error) {
      fallbackUsed = true;
      fallbackReason = error instanceof Error ? error.message : String(error);
      logger.error("RAG retrieval failed, returning fallback context", {
        error: fallbackReason,
      });

      // Still track cache miss even on failure
      const retrievalLatency = Date.now() - retrievalStart;
      const cacheAnalytics = getCacheAnalyticsService();
      cacheAnalytics.recordCacheMiss(query, retrievalLatency);
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
        const effectiveWindow = this._inferWindowHours(query) ?? this._temporalWindowHours;
        const clusters = this._temporalCorrelation.correlateByTimeWindow(documents, effectiveWindow);

        if (clusters.length > 0) {
          context = this._contextBuilder.buildTemporalContext(clusters);
          usedTemporalCorrelation = true;
          if (traceContext) {
            recordSpan(
              "temporal-correlation",
              "rag",
              traceContext,
              {
                documentCount: documents.length,
                entityTypes: Array.from(entityTypes),
                windowHours: effectiveWindow,
              },
              {
                clusterCount: clusters.length,
                contextLength: context.length,
              },
            );
          }
        } else {
          // Fallback to regular context if temporal correlation yields no results
          logger.warn("Temporal correlation yielded no results, using regular context");
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

    // Record final context preparation span
    if (traceContext) {
      recordSpan(
        "context-preparation",
        "rag",
        traceContext,
        {
          query: query.slice(0, 100),
        },
        {
          documentCount: documents.length,
          contextLength: context.length,
          duration: Date.now() - startTime,
          fallbackUsed,
          usedTemporalCorrelation,
          cached: false,
        },
      );
    }

    return ragContext;
  }

  clearCache(): void {
    this._contextCache.clear();

    // Update cache analytics stats
    const cacheAnalytics = getCacheAnalyticsService();
    cacheAnalytics.updateCacheStats({
      entryCount: 0,
      estimatedMemoryMB: 0,
    });
  }

  private _getFromCache(query: string): RAGContext | null {
    const key = this._buildCacheKey(query);
    const entry = this._contextCache.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    if (age > this._cacheDurationMs) {
      this._contextCache.delete(key);
      logger.info("Cache expired", { age, maxAge: this._cacheDurationMs });
      return null;
    }
    // Touch LRU: reinsert
    this._contextCache.delete(key);
    this._contextCache.set(key, entry);
    return entry;
  }

  private _putInCache(query: string, value: RAGContext): void {
    const key = this._buildCacheKey(query);

    // Check if eviction is needed
    let didEvict = false;
    if (this._contextCache.size >= this._maxCacheEntries) {
      const oldestKey = this._contextCache.keys().next().value as string | undefined;
      if (oldestKey) {
        this._contextCache.delete(oldestKey);
        didEvict = true;
      }
    }

    this._contextCache.set(key, value);

    // Update cache analytics
    const cacheAnalytics = getCacheAnalyticsService();
    if (didEvict) {
      cacheAnalytics.recordEviction();
    }

    // Estimate memory: ~2KB per document + context string
    const estimatedMemoryMB = (this._contextCache.size * 2) / 1024;
    cacheAnalytics.updateCacheStats({
      entryCount: this._contextCache.size,
      estimatedMemoryMB,
      maxEntries: this._maxCacheEntries,
    });
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
      throw new AItError("VECTOR_LENGTH_MISMATCH", "Vectors must have the same length");
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      const a = vec1[i]! as number;
      const b = vec2[i]! as number;
      dotProduct += a * b;
      norm1 += a * a;
      norm2 += b * b;
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
