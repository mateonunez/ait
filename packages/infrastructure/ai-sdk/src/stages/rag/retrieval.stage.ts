import { getLogger } from "@ait/core";
import { getAllCollections } from "../../config/collections.config";
import { getCacheAnalyticsService } from "../../services/analytics/cache-analytics.service";
import { type SemanticCacheService, getSemanticCacheService } from "../../services/cache/semantic-cache.service";
import { TypeFilterService } from "../../services/filtering/type-filter.service";
import type { MultiCollectionProvider } from "../../services/rag/multi-collection.provider";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { IMultiQueryRetrievalService } from "../../services/retrieval/multi-query-retrieval.service";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { CollectionWeight } from "../../types/collections";
import type { RetrievalInput, RetrievalOutput } from "../../types/stages";

const logger = getLogger();

interface SemanticRetrievalCacheEntry {
  documents: any[];
  collections: string[];
}

export class RetrievalStage implements IPipelineStage<RetrievalInput, RetrievalOutput> {
  readonly name = "retrieval";

  private readonly _multiQueryRetrieval: IMultiQueryRetrievalService;
  private readonly _multiCollectionProvider: MultiCollectionProvider;
  private readonly _semanticCache: SemanticCacheService;
  private readonly _enableCache: boolean;
  private readonly _typeFilterService: TypeFilterService;

  constructor(
    multiQueryRetrieval: IMultiQueryRetrievalService,
    multiCollectionProvider: MultiCollectionProvider,
    enableCache = true,
  ) {
    this._multiQueryRetrieval = multiQueryRetrieval;
    this._multiCollectionProvider = multiCollectionProvider;
    this._semanticCache = getSemanticCacheService();
    this._enableCache = enableCache;
    this._typeFilterService = new TypeFilterService();
  }

  async canExecute(input: RetrievalInput): Promise<boolean> {
    return input.needsRAG === true;
  }

  async execute(input: RetrievalInput, context: PipelineContext): Promise<RetrievalOutput> {
    const startTime = Date.now();
    const cacheAnalytics = getCacheAnalyticsService();
    const selectedCollections = input.routingResult
      ? input.routingResult.selectedCollections
      : getAllCollections().map((c) => ({ vendor: c.vendor, weight: c.defaultWeight }));

    const endSpan = context.traceContext
      ? createSpanWithTiming(
          "rag/retrieval",
          "retrieval",
          context.traceContext,
          {
            query: input.query.slice(0, 100),
            collections: selectedCollections.map((c) => c.vendor),
          },
          undefined,
          new Date(startTime),
        )
      : null;

    const effectiveQuery = input.retrievalQuery || input.query;

    // Build typeFilter FIRST to include temporal context in cache key
    const typeFilter =
      input.typeFilter ??
      (input.intent ? this._typeFilterService.inferTypes(undefined, input.query, { intent: input.intent }) : undefined);

    // Build cache context including collections AND temporal range
    const collectionContext = this._buildCacheContext(selectedCollections, typeFilter?.timeRange);

    if (this._enableCache) {
      logger.debug("Checking semantic cache", { query: effectiveQuery.slice(0, 50), collectionContext });

      // Pass query and context separately - query gets semantically normalized, context is preserved
      const cachedEntry = await this._semanticCache.get<SemanticRetrievalCacheEntry>(
        effectiveQuery,
        collectionContext,
        context.traceContext,
      );

      if (cachedEntry) {
        const duration = Date.now() - startTime;

        logger.debug("Semantic cache hit", {
          query: input.query.slice(0, 50),
          collectionContext,
          documentCount: cachedEntry.documents.length,
          duration,
        });

        cacheAnalytics.recordCacheHit(input.query, duration, cachedEntry.documents.length);

        if (context.traceContext) {
          const endCacheSpan = createSpanWithTiming(
            "cache/semantic-hit",
            "cache",
            context.traceContext,
            { query: input.query.slice(0, 100), collectionContext },
            undefined,
            new Date(startTime),
          );
          if (endCacheSpan) {
            endCacheSpan({ cacheHit: true, documentCount: cachedEntry.documents.length, latencyMs: duration });
          }
        }

        if (endSpan) {
          endSpan({
            documentCount: cachedEntry.documents.length,
            duration,
            source: "semantic-cache",
            cacheHit: true,
            cacheKey: `normalized|${collectionContext}`,
          });
        }

        return {
          ...input,
          documents: cachedEntry.documents,
          retrievalMetadata: {
            queriesExecuted: 0,
            totalDuration: duration,
            documentsPerCollection: { cache: cachedEntry.documents.length },
            fromCache: true,
          },
        };
      }

      logger.debug("Semantic cache miss", { query: input.query.slice(0, 50), collectionContext });
      cacheAnalytics.recordCacheMiss(input.query, Date.now() - startTime);

      if (context.traceContext) {
        const endCacheSpan = createSpanWithTiming(
          "cache/semantic-miss",
          "cache",
          context.traceContext,
          { query: input.query.slice(0, 100), collectionContext },
          undefined,
          new Date(startTime),
        );
        if (endCacheSpan) {
          endCacheSpan({ cacheHit: false, latencyMs: Date.now() - startTime });
        }
      }
    }

    // typeFilter already built above before cache check

    const allDocuments = await this._multiQueryRetrieval.retrieveAcrossCollections(
      this._multiCollectionProvider,
      selectedCollections,
      effectiveQuery,
      typeFilter,
      context.traceContext,
    );

    // Apply relevance floor to filter out low-quality results
    const relevanceFloor = 0.45;
    const filteredDocuments = allDocuments.filter((doc) => {
      const score = (doc.metadata as { score?: number }).score;
      return score === undefined || score >= relevanceFloor;
    });

    // Log warning if majority of documents were filtered out
    const filteredCount = allDocuments.length - filteredDocuments.length;
    if (filteredCount > 0 && filteredCount >= allDocuments.length * 0.5) {
      logger.warn("High proportion of documents filtered due to low relevance", {
        originalCount: allDocuments.length,
        filteredCount,
        remainingCount: filteredDocuments.length,
        relevanceFloor,
        query: input.query.slice(0, 50),
      });
    }

    const documents = filteredDocuments;
    const totalDuration = Date.now() - startTime;

    if (this._enableCache && documents.length > 0) {
      const cacheEntry: SemanticRetrievalCacheEntry = {
        documents,
        collections: selectedCollections.map((c) => c.vendor),
      };
      await this._semanticCache.set(effectiveQuery, cacheEntry, collectionContext);
      logger.debug("Cached retrieval results (semantic)", {
        query: effectiveQuery.slice(0, 50),
        collectionContext,
        documentCount: documents.length,
      });
    }

    const documentsPerCollection: Record<string, number> = {};
    for (const doc of documents) {
      const vendor = (doc.metadata.collectionVendor as string) || (doc.metadata.__vendor as string) || "unknown";
      documentsPerCollection[vendor] = (documentsPerCollection[vendor] || 0) + 1;
    }

    const telemetryData = {
      documentCount: documents.length,
      duration: totalDuration,
      collectionsQueried: selectedCollections.length,
      documentsPerCollection,
      cacheHit: false,
      filteredByRelevance: filteredCount,
    };

    if (endSpan) endSpan(telemetryData);

    logger.info(`Stage [${this.name}] completed`, telemetryData);

    return {
      ...input,
      documents,
      retrievalMetadata: {
        queriesExecuted: selectedCollections.length,
        totalDuration,
        documentsPerCollection,
        fromCache: false,
      },
    };
  }

  private _buildCacheContext(collections: CollectionWeight[], timeRange?: { from?: string; to?: string }): string {
    const sortedVendors = collections
      .map((c) => c.vendor)
      .sort()
      .join(",");

    // Include date range in cache key for temporal queries
    // Use just the date portion (YYYY-MM-DD) to handle timezone differences
    if (timeRange?.from || timeRange?.to) {
      const fromDate = timeRange.from ? timeRange.from.slice(0, 10) : "";
      const toDate = timeRange.to ? timeRange.to.slice(0, 10) : "";
      return `collections:${sortedVendors}|dates:${fromDate}:${toDate}`;
    }

    return `collections:${sortedVendors}`;
  }
}
