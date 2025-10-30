import { getQdrantClient, type qdrant } from "@ait/qdrant";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import { getEmbeddingModelConfig } from "../../client/ai-sdk.client";
import type { Document, BaseMetadata } from "../../types/documents";
import { extractContentFromPayload, extractMetadataFromPayload } from "../../types/qdrant";
import { EmbeddingsService } from "../embeddings/embeddings.service";

export interface QdrantProviderConfig {
  url?: string;
  collectionName: string;
  embeddingsModel?: string;
  expectedVectorSize?: number;
  embeddingsService?: IEmbeddingsService;
}

export class QdrantProvider {
  private readonly _config: Required<QdrantProviderConfig>;
  private readonly _embeddingsService: IEmbeddingsService;
  private readonly _client: qdrant.QdrantClient;

  constructor(config: QdrantProviderConfig) {
    const embeddingModelConfig = getEmbeddingModelConfig();

    this._config = {
      url: config.url || process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: config.collectionName,
      embeddingsModel: config.embeddingsModel || embeddingModelConfig.name,
      expectedVectorSize: config.expectedVectorSize || embeddingModelConfig.vectorSize,
      embeddingsService:
        config.embeddingsService ||
        new EmbeddingsService(
          config.embeddingsModel || embeddingModelConfig.name,
          config.expectedVectorSize || embeddingModelConfig.vectorSize,
          { concurrencyLimit: 4 },
        ),
    };

    this._embeddingsService = this._config.embeddingsService;
    this._client = getQdrantClient();
  }

  async similaritySearch(query: string, k: number): Promise<Document<BaseMetadata>[]> {
    const queryVector = await this._embeddingsService.generateEmbeddings(query, {
      concurrencyLimit: 4,
    });

    return this.similaritySearchWithVector(queryVector, k);
  }

  async similaritySearchWithVector(
    vector: number[],
    k: number,
    filter?: { types?: string[]; timeRange?: { from?: string; to?: string } },
  ): Promise<Document<BaseMetadata>[]> {
    let qdrantFilter: any;
    const must: any[] = [];
    const should: any[] = [];

    if (filter?.types && filter.types.length > 0) {
      if (filter.types.length === 1) {
        must.push({ key: "metadata.__type", match: { value: filter.types[0] } });
      } else {
        should.push(...filter.types.map((type) => ({ key: "metadata.__type", match: { value: type } })));
      }
    }

    if (filter?.timeRange && (filter.timeRange.from || filter.timeRange.to)) {
      const { from, to } = filter.timeRange;
      const fields = ["createdAt", "playedAt", "updatedAt", "mergedAt", "closedAt", "publishedAt", "timestamp", "date"];
      const range: any = {};
      if (from) range.gte = from;
      if (to) range.lte = to;
      const timeShould = fields.map((f) => ({ key: `metadata.${f}`, range }));
      must.push({ should: timeShould });
    }

    if (must.length > 0 || should.length > 0) {
      qdrantFilter = {};
      if (must.length > 0) qdrantFilter.must = must;
      if (should.length > 0) qdrantFilter.should = should;
    }

    const searchResult = await this._client.search(this._config.collectionName, {
      vector,
      limit: k,
      with_payload: true,
      filter: qdrantFilter,
    });

    return searchResult.map((point) => ({
      pageContent: extractContentFromPayload(point.payload || undefined),
      metadata: extractMetadataFromPayload(point.payload || undefined),
    }));
  }

  async similaritySearchWithScore(
    query: string,
    k: number,
    filter?: { types?: string[]; timeRange?: { from?: string; to?: string } },
    scoreThreshold?: number,
  ): Promise<Array<[Document<BaseMetadata>, number]>> {
    const queryVector = await this._embeddingsService.generateEmbeddings(query, {
      concurrencyLimit: 4,
    });

    let qdrantFilter: any;
    const must: any[] = [];
    const should: any[] = [];

    if (filter?.types && filter.types.length > 0) {
      if (filter.types.length === 1) {
        must.push({ key: "metadata.__type", match: { value: filter.types[0] } });
      } else {
        should.push(...filter.types.map((type) => ({ key: "metadata.__type", match: { value: type } })));
      }
    }

    if (filter?.timeRange && (filter.timeRange.from || filter.timeRange.to)) {
      const { from, to } = filter.timeRange;
      const fields = ["createdAt", "playedAt", "updatedAt", "mergedAt", "closedAt", "publishedAt", "timestamp", "date"];
      const range: any = {};
      if (from) range.gte = from;
      if (to) range.lte = to;
      const timeShould = fields.map((f) => ({ key: `metadata.${f}`, range }));
      must.push({ should: timeShould });
    }

    if (must.length > 0 || should.length > 0) {
      qdrantFilter = {};
      if (must.length > 0) qdrantFilter.must = must;
      if (should.length > 0) qdrantFilter.should = should;
    }

    // Use provided threshold or default to 0.3 for better quality
    const effectiveThreshold = scoreThreshold ?? 0.3;

    const searchResult = await this._client.search(this._config.collectionName, {
      vector: queryVector,
      limit: k,
      with_payload: true,
      score_threshold: effectiveThreshold,
      filter: qdrantFilter,
    });

    console.debug("Qdrant search result", {
      query: `${query.slice(0, 50)}...`,
      scoreThreshold: effectiveThreshold,
      filter: filter,
      resultsCount: searchResult.length,
      scoreRange:
        searchResult.length > 0
          ? `${searchResult[searchResult.length - 1].score.toFixed(3)} - ${searchResult[0].score.toFixed(3)}`
          : "none",
    });

    return searchResult.map((point) => [
      {
        pageContent: extractContentFromPayload(point.payload || undefined),
        metadata: extractMetadataFromPayload(point.payload || undefined),
      },
      point.score,
    ]);
  }

  reset(): void {
    // No-op since we're using a stateless client
  }
}
