import type { MultiQueryConfig, QueryResult } from "../../types/rag";
import type { Document, BaseMetadata } from "../../types/documents";
import type { QdrantProvider } from "./qdrant.provider";
import type { IQueryPlannerService } from "./query-planner.service";
import type { IDiversityService } from "./diversity.service";
import type { ITypeFilterService } from "./type-filter.service";
import type { IRankFusionService } from "./rank-fusion.service";
import type { IHyDEService } from "./hyde.service";
import type { IRerankService } from "./rerank.service";

export interface IMultiQueryRetrievalService {
  retrieve<TMetadata extends BaseMetadata = BaseMetadata>(
    vectorStore: QdrantProvider,
    userQuery: string,
  ): Promise<Document<TMetadata>[]>;
}

export class MultiQueryRetrievalService implements IMultiQueryRetrievalService {
  private readonly _maxDocs: number;
  private readonly _concurrency: number;
  private readonly _scoreThreshold: number;
  private readonly _queryPlanner: IQueryPlannerService;
  private readonly _diversity: IDiversityService;
  private readonly _typeFilter: ITypeFilterService;
  private readonly _rankFusion: IRankFusionService;
  private readonly _hyde?: IHyDEService;
  private readonly _reranker?: IRerankService;
  private readonly _useHyDE: boolean;

  constructor(
    queryPlanner: IQueryPlannerService,
    diversity: IDiversityService,
    typeFilter: ITypeFilterService,
    rankFusion: IRankFusionService,
    config: MultiQueryConfig = {},
    hyde?: IHyDEService,
    reranker?: IRerankService,
  ) {
    this._queryPlanner = queryPlanner;
    this._diversity = diversity;
    this._typeFilter = typeFilter;
    this._rankFusion = rankFusion;
    this._hyde = hyde;
    this._reranker = reranker;

    this._maxDocs = config.maxDocs ?? 100;
    this._concurrency = Math.min(Math.max(config.concurrency ?? 4, 1), 8);
    this._scoreThreshold = config.scoreThreshold ?? 0.3;
    this._useHyDE = config.useHyDE ?? true;
  }

  async retrieve<TMetadata extends BaseMetadata = BaseMetadata>(
    vectorStore: QdrantProvider,
    userQuery: string,
  ): Promise<Document<TMetadata>[]> {
    const queryPlan = await this._queryPlanner.planQueries(userQuery);
    const typeFilterResult = this._typeFilter.inferTypes(queryPlan.tags, queryPlan.originalQuery || userQuery, {
      usedFallback: queryPlan.usedFallback,
      intent: queryPlan.intent,
    });

    console.debug("Multi-query retrieval initiated", {
      queryCount: queryPlan.queries.length,
      tags: queryPlan.tags,
      typeFilter: typeFilterResult?.types,
      useHyDE: this._useHyDE && !!this._hyde,
      planSource: queryPlan.source,
      usedFallback: queryPlan.usedFallback,
    });

    const perQueryK = Math.max(20, Math.ceil((this._maxDocs * 1.5) / Math.max(1, queryPlan.queries.length)));
    const targetUnique = this._maxDocs; // early-stop when we have enough unique docs

    const parallelResults = await this._executeQueriesInParallel<TMetadata>(
      vectorStore,
      queryPlan.queries,
      perQueryK,
      typeFilterResult,
      targetUnique,
    );

    const allResults: QueryResult<TMetadata>[] = [...parallelResults];

    // HyDE gating: only use when unique results appear low
    const uniqueFromParallel = new Set<string>();
    for (const pr of parallelResults) {
      for (const [doc] of pr.results) {
        uniqueFromParallel.add(this._getDocumentId(doc as Document<BaseMetadata>));
      }
    }
    const uniqueCount = uniqueFromParallel.size;

    const shouldUseHyDE = this._useHyDE && !!this._hyde && uniqueCount < Math.floor(this._maxDocs * 0.6);

    if (shouldUseHyDE) {
      try {
        const hydeVector = await this._hyde.generateHyDEEmbedding(userQuery);
        const hydeDocs = await vectorStore.similaritySearchWithVector(hydeVector, perQueryK, typeFilterResult);
        const hydeResults: QueryResult<TMetadata> = {
          queryIdx: -1,
          results: hydeDocs.map((doc) => [doc as Document<TMetadata>, 1.0]),
        };
        allResults.push(hydeResults);
        console.debug("HyDE embedding generated", {
          queryLength: userQuery.length,
          hypoLength: hydeDocs.reduce((acc, d) => acc + (d.pageContent?.length || 0), 0),
        });
      } catch (error) {
        console.warn("HyDE generation failed, continuing without it", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      console.debug("Skipping HyDE due to sufficient recall", {
        uniqueCount,
        threshold: Math.floor(this._maxDocs * 0.6),
      });
    }

    if (allResults.length === 0) {
      console.warn("No results retrieved");
      return [];
    }

    const ranked = this._rankFusion.fuseResults(
      allResults as QueryResult<TMetadata>[],
      this._getDocumentId as (doc: Document<TMetadata>) => string,
    );

    if (ranked.length === 0) {
      console.warn("No unique documents after fusion");
      return [];
    }

    console.debug("RRF completed", {
      totalHits: ranked.length,
      topScores: ranked.slice(0, 3).map((r) => r.finalScore.toFixed(3)),
    });

    let finalResults = ranked.slice(0, this._maxDocs * 2).map((h) => h.doc);

    if (this._reranker && finalResults.length > 5) {
      const baseResults = finalResults.slice();
      try {
        finalResults = await this._reranker.rerank(userQuery, baseResults, this._maxDocs);
      } catch (error) {
        console.warn("Reranker unavailable, applying MMR fallback", {
          error: error instanceof Error ? error.message : String(error),
        });
        finalResults = this._diversity.applyMMR(baseResults, this._maxDocs);
      }
    } else {
      finalResults = this._diversity.applyMMR(finalResults, this._maxDocs);
    }

    console.debug("Final results", {
      finalResults: finalResults.length,
      finalResultsPreview: finalResults.slice(0, 3).map((r) => r.pageContent.slice(0, 200)),
    });

    return finalResults;
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
            // Clear remaining queue to stop early
            queue.length = 0;
            break;
          }

          if (lowGainStreak >= 3) {
            // Little marginal gain across recent queries, stop early
            queue.length = 0;
            break;
          }
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
