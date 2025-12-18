import { getLogger } from "@ait/core";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { CollectionWeight } from "../../types/collections";
import type { BaseMetadata, Document } from "../../types/documents";
import type { MultiQueryConfig, QueryResult, TypeFilter } from "../../types/rag";
import type { TraceContext } from "../../types/telemetry";
import type { MultiCollectionProvider } from "../rag/multi-collection.provider";
import type { QdrantProvider } from "../rag/qdrant.provider";

const logger = getLogger();

export interface IMultiQueryRetrievalService {
  retrieve<TMetadata extends BaseMetadata = BaseMetadata>(
    vectorStore: QdrantProvider,
    userQuery: string,
    typeFilter?: TypeFilter,
    traceContext?: TraceContext | null,
  ): Promise<QueryResult<TMetadata>[]>;

  retrieveAcrossCollections<TMetadata extends BaseMetadata = BaseMetadata>(
    multiCollectionProvider: MultiCollectionProvider,
    collectionWeights: CollectionWeight[],
    userQuery: string,
    typeFilter?: TypeFilter,
    traceContext?: TraceContext | null,
  ): Promise<Document<TMetadata>[]>;
}

export class MultiQueryRetrievalService implements IMultiQueryRetrievalService {
  private readonly _maxDocs: number;
  private readonly _concurrency: number;
  private readonly _scoreThreshold: number;

  constructor(config: MultiQueryConfig = {}) {
    this._maxDocs = config.maxDocs ?? 100;
    this._concurrency = Math.min(Math.max(config.concurrency ?? 4, 1), 8);
    this._scoreThreshold = config.scoreThreshold ?? 0.2;
  }

  /**
   * Retrieve documents from a single vector store.
   * Returns raw QueryResult[] for pipeline stages to process.
   * @param typeFilter - Optional type filter passed from upstream analysis stage
   */
  async retrieve<TMetadata extends BaseMetadata = BaseMetadata>(
    vectorStore: QdrantProvider,
    userQuery: string,
    typeFilter?: TypeFilter,
    traceContext?: TraceContext | null,
  ): Promise<QueryResult<TMetadata>[]> {
    const startTime = Date.now();

    // Create span at start for accurate timing
    const endSpan = traceContext
      ? createSpanWithTiming(
          "rag/multi-query-retrieval",
          "rag",
          traceContext,
          {
            query: userQuery.slice(0, 100),
            typeFilter: typeFilter?.types,
          },
          undefined,
          new Date(),
        )
      : null;

    logger.debug("Multi-query retrieval initiated", {
      query: userQuery.slice(0, 50),
      typeFilter: typeFilter?.types,
    });

    const perQueryK = this._maxDocs;
    const targetUnique = this._maxDocs;

    let parallelResults = await this._executeQueriesInParallel<TMetadata>(
      vectorStore,
      [userQuery], // Execute with the provided query
      perQueryK,
      typeFilter,
      targetUnique,
    );

    // Retry without time filter if no results
    if (parallelResults.length === 0 && typeFilter?.timeRange) {
      logger.warn("No results with time filter, retrying without time constraints...");
      const typeFilterWithoutTime = typeFilter.types ? { types: typeFilter.types } : undefined;

      parallelResults = await this._executeQueriesInParallel<TMetadata>(
        vectorStore,
        [userQuery],
        perQueryK,
        typeFilterWithoutTime,
        targetUnique,
      );
    }

    // Record telemetry
    const duration = Date.now() - startTime;
    const telemetryData = {
      documentCount: parallelResults.reduce((acc, r) => acc + r.results.length, 0),
      queryVariantsExecuted: parallelResults.length,
      duration,
    };

    if (endSpan) {
      endSpan(telemetryData);
    }
    logger.debug("Multi-query retrieval completed", telemetryData);

    return parallelResults;
  }

  /**
   * Retrieve documents across multiple collections.
   * Returns raw Document[] with scores in metadata for pipeline stages to process.
   * @param typeFilter - Optional type filter passed from upstream analysis stage
   */
  async retrieveAcrossCollections<TMetadata extends BaseMetadata = BaseMetadata>(
    multiCollectionProvider: MultiCollectionProvider,
    collectionWeights: CollectionWeight[],
    userQuery: string,
    typeFilter?: TypeFilter,
    traceContext?: TraceContext | null,
  ): Promise<Document<TMetadata>[]> {
    const startTime = Date.now();

    // Create span at start for accurate timing
    const endSpan = traceContext
      ? createSpanWithTiming(
          "rag/multi-collection-retrieval",
          "rag",
          traceContext,
          {
            query: userQuery.slice(0, 100),
            collectionsCount: collectionWeights.length,
            collections: collectionWeights.map((c) => c.vendor),
          },
          undefined,
          new Date(),
        )
      : null;

    logger.debug("Multi-collection retrieval started", {
      query: userQuery.slice(0, 50),
      collections: collectionWeights.map((c) => c.vendor),
      typeFilter: typeFilter?.types,
    });

    // Execute searches across each collection
    const searchResults = await multiCollectionProvider.searchAcrossCollectionsWithScore<TMetadata>(
      userQuery,
      collectionWeights,
      this._maxDocs,
      this._scoreThreshold,
      typeFilter,
      traceContext || undefined,
    );

    // Flatten results with collection metadata
    const allDocuments: Document<TMetadata>[] = [];

    for (const result of searchResults) {
      const collectionWeight = collectionWeights.find((cw) => cw.vendor === result.vendor)?.weight || 1.0;

      for (const [doc, score] of result.documents) {
        allDocuments.push({
          pageContent: doc.pageContent,
          metadata: {
            ...doc.metadata,
            score,
            collectionVendor: result.vendor,
            collectionWeight,
          } as TMetadata,
        });
      }
    }

    if (allDocuments.length === 0) {
      logger.warn("No results retrieved from any collection");
      return [];
    }

    logger.debug("Multi-collection retrieval completed", {
      totalDocuments: allDocuments.length,
      collectionsQueried: searchResults.length,
    });

    // Record telemetry
    const duration = Date.now() - startTime;
    const telemetryData = {
      documentCount: allDocuments.length,
      collectionsSearched: searchResults.length,
      duration,
      collectionDistribution: this._getCollectionDistribution(allDocuments),
    };

    if (endSpan) {
      endSpan(telemetryData);
    }

    logger.info("Multi-collection retrieval completed", telemetryData);

    return allDocuments;
  }

  private async _executeQueriesInParallel<TMetadata extends BaseMetadata>(
    vectorStore: QdrantProvider,
    queries: string[],
    perQueryK: number,
    typeFilter?: { types?: string[] },
    targetUnique?: number,
  ): Promise<QueryResult<TMetadata>[]> {
    const allResults: QueryResult<TMetadata>[] = [];
    const queue = queries.map((q, idx) => ({ query: q, queryIdx: idx }));
    const workers: Promise<void>[] = [];
    const uniqueIds = new Set<string>();
    let lowGainStreak = 0;

    const runWorker = async () => {
      while (queue.length) {
        const task = queue.shift();
        if (!task) break;

        try {
          const pairs = await vectorStore.similaritySearchWithScore(
            task.query,
            perQueryK,
            typeFilter,
            this._scoreThreshold,
          );

          allResults.push({
            queryIdx: task.queryIdx,
            results: pairs as Array<[Document<TMetadata>, number]>,
          });

          // Early-stop and marginal gain detection
          const before = uniqueIds.size;
          for (const [doc] of pairs as Array<[Document<TMetadata>, number]>) {
            uniqueIds.add(this._getDocumentId(doc as Document<BaseMetadata>));
          }
          const gained = uniqueIds.size - before;
          lowGainStreak = gained < 3 ? lowGainStreak + 1 : 0;

          if (targetUnique && uniqueIds.size >= targetUnique) {
            queue.length = 0;
            break;
          }

          if (lowGainStreak >= 3) {
            queue.length = 0;
            break;
          }
        } catch (e) {
          logger.debug("Query variant failed", {
            query: task.query,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    };

    for (let i = 0; i < this._concurrency; i++) {
      workers.push(runWorker());
    }

    await Promise.all(workers);

    return allResults;
  }

  private _getCollectionDistribution<TMetadata extends BaseMetadata>(
    documents: Array<Document<TMetadata> | { collectionVendor: string }>,
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const doc of documents) {
      const vendor =
        "collectionVendor" in doc && doc.collectionVendor
          ? String(doc.collectionVendor)
          : "metadata" in doc && doc.metadata && "collectionVendor" in doc.metadata
            ? String(doc.metadata.collectionVendor)
            : "unknown";

      distribution[vendor] = (distribution[vendor] || 0) + 1;
    }

    return distribution;
  }

  private _getDocumentId(doc: Document<BaseMetadata>): string {
    if (doc.metadata.id) {
      return doc.metadata.id;
    }
    const src = doc.metadata.__type || "unknown";
    return `${src}:${doc.pageContent.slice(0, 80)}`;
  }
}

export function createMultiQueryRetrievalService(config: MultiQueryConfig = {}): IMultiQueryRetrievalService {
  return new MultiQueryRetrievalService(config);
}
