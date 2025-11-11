import { getQdrantClient, type qdrant } from "@ait/qdrant";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import { getEmbeddingModelConfig } from "../../client/ai-sdk.client";
import type { Document, BaseMetadata } from "../../types/documents";
import { extractContentFromPayload, extractMetadataFromPayload } from "../../types/qdrant";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { recordSpan } from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";

export interface QdrantProviderConfig {
  url?: string;
  collectionName: string;
  embeddingsModel?: string;
  expectedVectorSize?: number;
  embeddingsService?: IEmbeddingsService;
  enableTelemetry?: boolean;
  traceContext?: TraceContext;
}

export class QdrantProvider {
  private readonly _config: QdrantProviderConfig & {
    url: string;
    embeddingsModel: string;
    expectedVectorSize: number;
    embeddingsService: IEmbeddingsService;
  };
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
      enableTelemetry: config.enableTelemetry,
      traceContext: config.traceContext,
    };

    this._embeddingsService = this._config.embeddingsService;
    this._client = getQdrantClient();
  }

  async similaritySearch(
    query: string,
    k: number,
    options?: { enableTelemetry?: boolean; traceContext?: TraceContext },
  ): Promise<Document<BaseMetadata>[]> {
    const startTime = Date.now();

    const queryVector = await this._embeddingsService.generateEmbeddings(query, {
      concurrencyLimit: 4,
      enableTelemetry: options?.enableTelemetry,
      traceContext: options?.traceContext,
    });

    const results = await this.similaritySearchWithVector(queryVector, k);

    if (options?.enableTelemetry && options?.traceContext) {
      recordSpan(
        "similarity-search",
        "search",
        options.traceContext,
        {
          query: query.slice(0, 100),
          k,
        },
        {
          resultCount: results.length,
          duration: Date.now() - startTime,
        },
      );
    }

    return results;
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
    options?: { enableTelemetry?: boolean; traceContext?: TraceContext },
  ): Promise<Array<[Document<BaseMetadata>, number]>> {
    const startTime = Date.now();

    const queryVector = await this._embeddingsService.generateEmbeddings(query, {
      concurrencyLimit: 4,
      enableTelemetry: options?.enableTelemetry,
      traceContext: options?.traceContext,
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

    const effectiveThreshold = scoreThreshold ?? 0.2;

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
          ? `${searchResult[searchResult.length - 1]?.score.toFixed(3) ?? "0"} - ${searchResult[0]?.score.toFixed(3) ?? "0"}`
          : "none",
    });

    const results = searchResult.map((point) => [
      {
        pageContent: extractContentFromPayload(point.payload || undefined),
        metadata: extractMetadataFromPayload(point.payload || undefined),
      },
      point.score,
    ]);

    if (options?.enableTelemetry && options?.traceContext) {
      recordSpan(
        "vector-search",
        "search",
        options.traceContext,
        {
          query: query.slice(0, 100),
          k,
          scoreThreshold: effectiveThreshold,
          filterTypes: filter?.types,
          hasTimeRange: !!filter?.timeRange,
        },
        {
          resultCount: results.length,
          avgScore:
            results.length > 0
              ? results.reduce((sum, [, score]) => sum + (typeof score === "number" ? score : 0), 0) / results.length
              : 0,
          maxScore: results.length > 0 ? (results[0]?.[1] ?? 0) : 0,
          minScore: results.length > 0 ? (results[results.length - 1]?.[1] ?? 0) : 0,
          duration: Date.now() - startTime,
        },
      );
    }

    return results as Array<[Document<BaseMetadata>, number]>;
  }

  reset(): void {
    // No-op since we're using a stateless client
  }
}
