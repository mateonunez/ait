import { getLogger } from "@ait/core";
import { getCacheAnalyticsService } from "../../services/analytics/cache-analytics.service";
import { type SemanticCacheService, getSemanticCacheService } from "../../services/cache/semantic-cache.service";
import type { MultiCollectionProvider } from "../../services/rag/multi-collection.provider";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { IMultiQueryRetrievalService } from "../../services/retrieval/multi-query-retrieval.service";
import { createSpanWithTiming, recordSpan } from "../../telemetry/telemetry.middleware";
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

  constructor(
    multiQueryRetrieval: IMultiQueryRetrievalService,
    multiCollectionProvider: MultiCollectionProvider,
    enableCache = true,
  ) {
    this._multiQueryRetrieval = multiQueryRetrieval;
    this._multiCollectionProvider = multiCollectionProvider;
    this._semanticCache = getSemanticCacheService();
    this._enableCache = enableCache;
  }

  async canExecute(input: RetrievalInput): Promise<boolean> {
    return input.shouldUseFastPath !== true;
  }

  async execute(input: RetrievalInput, context: PipelineContext): Promise<RetrievalOutput> {
    const startTime = Date.now();
    const cacheAnalytics = getCacheAnalyticsService();
    const endSpan = context.traceContext
      ? createSpanWithTiming(this.name, "retrieval", context.traceContext, {
          query: input.query.slice(0, 100),
          collections: input.routingResult.selectedCollections.map((c) => c.vendor),
        })
      : null;

    // Build collection context for cache key (not normalized)
    const collectionContext = this._buildCollectionContext(input.routingResult.selectedCollections);

    if (this._enableCache) {
      logger.debug("Checking semantic cache", { query: input.query.slice(0, 50), collectionContext });

      // Pass query and context separately - query gets semantically normalized, context is preserved
      const cachedEntry = await this._semanticCache.get<SemanticRetrievalCacheEntry>(
        input.query,
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
          recordSpan(
            "rag-semantic-cache-hit",
            "cache",
            context.traceContext,
            { query: input.query.slice(0, 100), collectionContext },
            { cacheHit: true, documentCount: cachedEntry.documents.length, latencyMs: duration },
          );
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
        recordSpan(
          "rag-semantic-cache-miss",
          "cache",
          context.traceContext,
          { query: input.query.slice(0, 100), collectionContext },
          { cacheHit: false, latencyMs: Date.now() - startTime },
        );
      }
    }

    const documents = await this._multiQueryRetrieval.retrieveAcrossCollections(
      this._multiCollectionProvider,
      input.routingResult.selectedCollections,
      input.query,
      context.traceContext,
    );

    const totalDuration = Date.now() - startTime;

    if (this._enableCache && documents.length > 0) {
      const cacheEntry: SemanticRetrievalCacheEntry = {
        documents,
        collections: input.routingResult.selectedCollections.map((c) => c.vendor),
      };
      await this._semanticCache.set(input.query, cacheEntry, collectionContext);
      logger.debug("Cached retrieval results (semantic)", {
        query: input.query.slice(0, 50),
        collectionContext,
        documentCount: documents.length,
      });
    }

    const documentsPerCollection: Record<string, number> = {};
    for (const doc of documents) {
      const vendor = (doc.metadata.collectionVendor as string) || (doc.metadata.__vendor as string) || "unknown";
      documentsPerCollection[vendor] = (documentsPerCollection[vendor] || 0) + 1;
    }

    if (endSpan) {
      endSpan({
        documentCount: documents.length,
        duration: totalDuration,
        collectionsQueried: input.routingResult.selectedCollections.length,
        documentsPerCollection,
        cacheHit: false,
      });
    }

    return {
      ...input,
      documents,
      retrievalMetadata: {
        queriesExecuted: input.routingResult.selectedCollections.length,
        totalDuration,
        documentsPerCollection,
        fromCache: false,
      },
    };
  }

  private _buildCollectionContext(collections: CollectionWeight[]): string {
    const sortedVendors = collections
      .map((c) => c.vendor)
      .sort()
      .join(",");

    return `collections:${sortedVendors}`;
  }
}
