import type { MultiQueryConfig, QueryResult } from "../../types/rag";
import type { Document, BaseMetadata } from "../../types/documents";
import type { QdrantProvider } from "../../rag/qdrant.provider";
import type { IQueryPlannerService } from "./query-planner.service";
import type { IDiversityService } from "./diversity.service";
import type { ITypeFilterService } from "./type-filter.service";
import type { IRankFusionService } from "./rank-fusion.service";

/**
 * Interface for multi-query retrieval service
 */
export interface IMultiQueryRetrievalService {
  /**
   * Retrieve documents using multi-query approach with RRF and diversification
   * @param vectorStore - Vector store provider for similarity search
   * @param userQuery - User's search query
   * @returns Array of relevant documents
   */
  retrieve<TMetadata extends BaseMetadata = BaseMetadata>(
    vectorStore: QdrantProvider,
    userQuery: string,
  ): Promise<Document<TMetadata>[]>;
}

/**
 * Orchestrator service for multi-query retrieval with RRF and diversification
 */
export class MultiQueryRetrievalService implements IMultiQueryRetrievalService {
  private readonly _maxDocs: number;
  private readonly _concurrency: number;
  private readonly _scoreThreshold: number;
  private readonly _queryPlanner: IQueryPlannerService;
  private readonly _diversity: IDiversityService;
  private readonly _typeFilter: ITypeFilterService;
  private readonly _rankFusion: IRankFusionService;

  constructor(
    queryPlanner: IQueryPlannerService,
    diversity: IDiversityService,
    typeFilter: ITypeFilterService,
    rankFusion: IRankFusionService,
    config: MultiQueryConfig = {},
  ) {
    this._queryPlanner = queryPlanner;
    this._diversity = diversity;
    this._typeFilter = typeFilter;
    this._rankFusion = rankFusion;

    this._maxDocs = config.maxDocs ?? 100;
    this._concurrency = Math.min(Math.max(config.concurrency ?? 4, 1), 8);
    this._scoreThreshold = config.scoreThreshold ?? 0.3;
  }

  async retrieve<TMetadata extends BaseMetadata = BaseMetadata>(
    vectorStore: QdrantProvider,
    userQuery: string,
  ): Promise<Document<TMetadata>[]> {
    // Step 1: Plan diverse query variants
    const queryPlan = await this._queryPlanner.planQueries(userQuery);
    const typeFilterResult = this._typeFilter.detectTypeFilter(userQuery);

    console.debug("Multi-query retrieval initiated", {
      queryCount: queryPlan.queries.length,
      querySource: queryPlan.source,
      isDiverse: queryPlan.isDiverse,
      typeFilter: typeFilterResult?.types,
    });

    // Step 2: Execute queries in parallel with worker pool
    const perQueryK = Math.max(20, Math.ceil((this._maxDocs * 1.5) / Math.max(1, queryPlan.queries.length)));
    const allResults = await this._executeQueriesInParallel(
      vectorStore,
      queryPlan.queries,
      perQueryK,
      typeFilterResult,
    );

    if (allResults.length === 0) {
      console.warn("No results retrieved across query variants");
      return [];
    }

    // Step 3: Apply Reciprocal Rank Fusion
    const ranked = this._rankFusion.fuseResults(
      allResults as QueryResult<TMetadata>[],
      this._getDocumentId as (doc: Document<TMetadata>) => string,
    );

    if (ranked.length === 0) {
      console.warn("No unique documents found after rank fusion");
      return [];
    }

    console.debug("RRF ranking completed", {
      totalHits: ranked.length,
      avgHitsPerDoc: ranked.reduce((s, h) => s + h.hits, 0) / ranked.length,
      topScores: ranked.slice(0, 3).map((r) => ({ score: r.finalScore.toFixed(3), hits: r.hits })),
    });

    // Step 4: Apply MMR for diversity if enabled
    let finalResults = ranked.slice(0, this._maxDocs).map((h) => h.doc);

    if (finalResults.length > 5) {
      const candidateDocs = ranked.slice(0, this._maxDocs * 2).map((h) => h.doc);
      finalResults = this._diversity.applyMMR(finalResults, candidateDocs, this._maxDocs);
    }

    return finalResults;
  }

  private async _executeQueriesInParallel<TMetadata extends BaseMetadata>(
    vectorStore: QdrantProvider,
    queries: string[],
    perQueryK: number,
    typeFilter?: { types?: string[] },
  ): Promise<QueryResult<TMetadata>[]> {
    const allResults: QueryResult<TMetadata>[] = [];
    const queue = queries.map((q, idx) => ({ query: q, queryIdx: idx }));
    const workers: Promise<void>[] = [];

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
        } catch (e) {
          console.debug("Query variant failed", {
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

  private _getDocumentId(doc: Document<BaseMetadata>): string {
    if (doc.metadata.id) {
      return doc.metadata.id;
    }
    // Fallback ID generation
    const src = doc.metadata.__type || "unknown";
    return `${src}:${doc.pageContent.slice(0, 80)}`;
  }
}
