import { getLogger } from "@ait/core";
import { getCacheAnalyticsService } from "../../services/analytics/cache-analytics.service";
import type { ICacheService } from "../../services/cache/cache.service";
import type { MultiCollectionProvider } from "../../services/rag/multi-collection.provider";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { IMultiQueryRetrievalService } from "../../services/retrieval/multi-query-retrieval.service";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { CollectionWeight } from "../../types/collections";
import type { RetrievalInput, RetrievalOutput } from "../../types/stages";

const logger = getLogger();

export class RetrievalStage implements IPipelineStage<RetrievalInput, RetrievalOutput> {
  readonly name = "retrieval";

  private readonly multiQueryRetrieval: IMultiQueryRetrievalService;
  private readonly multiCollectionProvider: MultiCollectionProvider;
  private readonly cacheService?: ICacheService;

  constructor(
    multiQueryRetrieval: IMultiQueryRetrievalService,
    multiCollectionProvider: MultiCollectionProvider,
    cacheService?: ICacheService,
  ) {
    this.multiQueryRetrieval = multiQueryRetrieval;
    this.multiCollectionProvider = multiCollectionProvider;
    this.cacheService = cacheService;
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

    if (this.cacheService) {
      const cacheKey = this._buildCacheKey(input.query, input.routingResult.selectedCollections);
      logger.debug("Checking cache", { cacheKey, query: input.query.slice(0, 50) });

      const cachedResult = this.cacheService.get<any[]>(cacheKey);
      const cachedDocs = cachedResult instanceof Promise ? await cachedResult : cachedResult;

      if (cachedDocs) {
        const duration = Date.now() - startTime;

        logger.debug("Cache hit", { cacheKey, documentCount: cachedDocs.length, duration });

        cacheAnalytics.recordCacheHit(input.query, duration, cachedDocs.length);

        if (endSpan) {
          endSpan({
            documentCount: cachedDocs.length,
            duration,
            source: "cache",
            cacheHit: true,
            cacheKey,
          });
        }

        return {
          ...input,
          documents: cachedDocs,
          retrievalMetadata: {
            queriesExecuted: 0,
            totalDuration: duration,
            documentsPerCollection: { cache: cachedDocs.length },
            fromCache: true,
          },
        };
      }

      logger.debug("Cache miss", { cacheKey });
      cacheAnalytics.recordCacheMiss(input.query, 0); // Latency updated after retrieval
    }

    const documents = await this.multiQueryRetrieval.retrieveAcrossCollections(
      this.multiCollectionProvider,
      input.routingResult.selectedCollections,
      input.query,
      context.traceContext,
    );

    const totalDuration = Date.now() - startTime;

    if (this.cacheService) {
      const cacheKey = this._buildCacheKey(input.query, input.routingResult.selectedCollections);
      const setResult = this.cacheService.set(cacheKey, documents, 60 * 60 * 1000);
      if (setResult instanceof Promise) {
        await setResult;
      }
      logger.debug("Cached retrieval results", { cacheKey, documentCount: documents.length });
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

  private _normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, " ");
  }

  private _buildCacheKey(query: string, collections: CollectionWeight[]): string {
    const normalizedQuery = this._normalizeQuery(query);

    const sortedVendors = collections
      .map((c) => c.vendor)
      .sort()
      .join(",");

    return `rag:retrieval:${normalizedQuery}:${sortedVendors}`;
  }
}
