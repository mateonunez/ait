import { getLogger } from "@ait/core";
import { getQdrantClient, type qdrant } from "@ait/qdrant";
import { getEmbeddingModelConfig } from "../../client/ai-sdk.client";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { BaseMetadata, Document } from "../../types/documents";
import { extractContentFromPayload, extractMetadataFromPayload } from "../../types/qdrant";
import type { TraceContext } from "../../types/telemetry";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";

const logger = getLogger();

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

  /**
   * Build a Qdrant filter that combines entity type matching with entity-specific date field filtering.
   * This ensures that for each entity type, only its relevant date field is checked (e.g., playedAt for recently_played).
   */
  private _buildQdrantFilter(filter?: {
    types?: string[];
    timeRange?: { from?: string; to?: string };
  }): any | undefined {
    const must: any[] = [];
    const should: any[] = [];

    // Entity-type-specific date field mapping
    const entityDateFields: Record<string, string> = {
      recently_played: "playedAt",
      tweet: "createdAt",
      pull_request: "mergedAt",
      repository: "pushedAt",
      issue: "updatedAt",
      track: "createdAt",
      artist: "createdAt",
      playlist: "createdAt",
      album: "createdAt",
    };

    if (
      filter?.timeRange &&
      (filter.timeRange.from || filter.timeRange.to) &&
      filter?.types &&
      filter.types.length > 0
    ) {
      // Build type-specific date filters: match documents where type AND its specific date field are both in range
      const { from, to } = filter.timeRange;
      const range: any = {};
      if (from) range.gte = from;
      if (to) range.lte = to;

      const typeSpecificConditions: any[] = [];
      for (const type of filter.types) {
        const dateField = entityDateFields[type] || "createdAt";
        typeSpecificConditions.push({
          must: [
            { key: "metadata.__type", match: { value: type } },
            { key: `metadata.${dateField}`, range },
          ],
        });
      }

      // At least one type+date combination must match (OR of all type-specific conditions)
      must.push({ should: typeSpecificConditions });
    } else {
      // No date filter or no type filter - use simpler logic
      if (filter?.types && filter.types.length > 0) {
        if (filter.types.length === 1) {
          must.push({ key: "metadata.__type", match: { value: filter.types[0] } });
        } else {
          should.push(...filter.types.map((type) => ({ key: "metadata.__type", match: { value: type } })));
        }
      }

      if (filter?.timeRange && (filter.timeRange.from || filter.timeRange.to)) {
        const { from, to } = filter.timeRange;
        const fallbackFields = ["createdAt", "playedAt", "updatedAt", "mergedAt", "pushedAt"];
        const range: any = {};
        if (from) range.gte = from;
        if (to) range.lte = to;
        const timeShould = fallbackFields.map((f) => ({ key: `metadata.${f}`, range }));
        must.push({ should: timeShould });
      }
    }

    if (must.length > 0 || should.length > 0) {
      const qdrantFilter: any = {};
      if (must.length > 0) qdrantFilter.must = must;
      if (should.length > 0) qdrantFilter.should = should;
      return qdrantFilter;
    }

    return undefined;
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
      const endSpan = createSpanWithTiming("similarity-search", "search", options.traceContext, {
        query: query.slice(0, 100),
        k,
      });
      if (endSpan) {
        endSpan({
          resultCount: results.length,
          duration: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  async similaritySearchWithVector(
    vector: number[],
    k: number,
    filter?: { types?: string[]; timeRange?: { from?: string; to?: string } },
  ): Promise<Document<BaseMetadata>[]> {
    const qdrantFilter = this._buildQdrantFilter(filter);

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

    const qdrantFilter = this._buildQdrantFilter(filter);

    const effectiveThreshold = scoreThreshold ?? 0.2;

    // Log the exact Qdrant filter for debugging
    if (qdrantFilter) {
      logger.debug("Qdrant filter being applied", {
        collection: this._config.collectionName,
        filter: JSON.stringify(qdrantFilter, null, 2),
      });
    }

    const searchResult = await this._client.search(this._config.collectionName, {
      vector: queryVector,
      limit: k,
      with_payload: true,
      score_threshold: effectiveThreshold,
      filter: qdrantFilter,
    });

    logger.debug("Qdrant search result", {
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
      const endSpan = createSpanWithTiming("vector-search", "search", options.traceContext, {
        query: query.slice(0, 100),
        k,
        scoreThreshold: effectiveThreshold,
        filterTypes: filter?.types,
        hasTimeRange: !!filter?.timeRange,
      });
      if (endSpan) {
        endSpan({
          resultCount: results.length,
          avgScore:
            results.length > 0
              ? results.reduce((sum, [, score]) => sum + (typeof score === "number" ? score : 0), 0) / results.length
              : 0,
          maxScore: results.length > 0 ? (results[0]?.[1] ?? 0) : 0,
          minScore: results.length > 0 ? (results[results.length - 1]?.[1] ?? 0) : 0,
          duration: Date.now() - startTime,
        });
      }
    }

    return results as Array<[Document<BaseMetadata>, number]>;
  }

  reset(): void {
    // No-op since we're using a stateless client
  }
}
