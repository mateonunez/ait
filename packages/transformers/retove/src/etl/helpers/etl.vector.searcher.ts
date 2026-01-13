import type { IEmbeddingsService } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { getLogger } from "@ait/core";
import type { qdrant } from "@ait/qdrant";
import type { BaseVectorPoint } from "../retove.etl.types";

export class ETLVectorSearcher {
  private readonly _logger = getLogger();
  private readonly _queryEmbeddingCache: Map<string, number[]> = new Map();

  constructor(
    private readonly _qdrantClient: qdrant.QdrantClient,
    private readonly _collectionName: string,
    private readonly _vectorSize: number,
    private readonly _embeddingsService: IEmbeddingsService,
    private readonly _getEntityType: () => EntityType | "unknown",
  ) {}

  async search(
    queryVector: number[],
    searchLimit: number,
    filter?: Record<string, unknown>,
  ): Promise<BaseVectorPoint[]> {
    this._logger.info(`Searching in collection ${this._collectionName} with limit ${searchLimit}`);

    const searchParams = {
      vector: queryVector,
      limit: searchLimit,
      filter: filter,
      params: {
        hnsw_ef: 128,
        exact: false,
      },
      with_payload: true,
      with_vectors: false,
      score_threshold: 0.5,
    };

    const result = await this._qdrantClient.search(this._collectionName, searchParams);

    return result.map((hit) => ({
      id: String(hit.id),
      vector: [],
      payload: {
        ...hit.payload,
        _score: hit.score,
      },
      __type: this._getEntityType(),
    })) as BaseVectorPoint[];
  }

  async searchByText(
    queryText: string,
    searchLimit: number,
    filter?: Record<string, unknown>,
  ): Promise<BaseVectorPoint[]> {
    this._logger.info(`Generating embedding for the query text: ${queryText.substring(0, 50)}...`);

    let queryVector = this._getCachedQuery(queryText);
    if (!queryVector) {
      queryVector = await this._embeddingsService.generateEmbeddings(queryText, {
        correlationId: `search-${Date.now()}`,
      });
      this._cacheQuery(queryText, queryVector);
    }

    if (queryVector.length !== this._vectorSize) {
      throw new Error(`Invalid query vector size: ${queryVector.length}. Expected: ${this._vectorSize}`);
    }

    return this.search(queryVector, searchLimit, filter);
  }

  private _getCachedQuery(queryText: string): number[] | undefined {
    return this._queryEmbeddingCache.get(queryText);
  }

  private _cacheQuery(queryText: string, vector: number[]): void {
    this._queryEmbeddingCache.set(queryText, vector);
  }
}
