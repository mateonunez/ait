import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { RetrievalInput, RetrievalOutput } from "../../types/stages";
import type { IMultiQueryRetrievalService } from "../../services/retrieval/multi-query-retrieval.service";
import type { MultiCollectionProvider } from "../../services/rag/multi-collection.provider";
import { recordSpan } from "../../telemetry/telemetry.middleware";
import type { ICacheService } from "../../services/cache/cache.service";
import { getCacheAnalyticsService } from "../../services/analytics/cache-analytics.service";

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

    if (this.cacheService) {
      const cachedDocs = await this.cacheService.get<any[]>(input.query);
      if (cachedDocs) {
        const duration = Date.now() - startTime;

        // Record cache hit
        cacheAnalytics.recordCacheHit(input.query, duration, cachedDocs.length);

        if (context.traceContext) {
          recordSpan(
            this.name,
            "retrieval",
            context.traceContext,
            {
              query: input.query.slice(0, 100),
              cacheHit: true,
            },
            {
              documentCount: cachedDocs.length,
              duration,
              source: "cache",
            },
          );
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
      await this.cacheService.set(input.query, documents);
    }

    const documentsPerCollection: Record<string, number> = {};
    for (const doc of documents) {
      const vendor = (doc.metadata.collectionVendor as string) || (doc.metadata.__vendor as string) || "unknown";
      documentsPerCollection[vendor] = (documentsPerCollection[vendor] || 0) + 1;
    }

    if (context.traceContext) {
      recordSpan(
        this.name,
        "retrieval",
        context.traceContext,
        {
          query: input.query.slice(0, 100),
          collections: input.routingResult.selectedCollections.map((c) => c.vendor),
          cacheHit: false,
        },
        {
          documentCount: documents.length,
          duration: totalDuration,
          collectionsQueried: input.routingResult.selectedCollections.length,
          documentsPerCollection,
        },
      );
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
}
