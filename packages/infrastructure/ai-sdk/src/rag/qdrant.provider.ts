import { getQdrantClient, type qdrant } from "@ait/qdrant";
import { EmbeddingsService } from "../services/embeddings/embeddings.service";
import type { IEmbeddingsService } from "../services/embeddings/embeddings.service";
import { getEmbeddingModelConfig } from "../client/ai-sdk.client";
import type { Document, BaseMetadata } from "../types/documents";
import { extractContentFromPayload, extractMetadataFromPayload } from "../types/qdrant";

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

    const searchResult = await this._client.search(this._config.collectionName, {
      vector: queryVector,
      limit: k,
      with_payload: true,
    });

    return searchResult.map((point) => ({
      pageContent: extractContentFromPayload(point.payload || undefined),
      metadata: extractMetadataFromPayload(point.payload || undefined),
    }));
  }

  async similaritySearchWithScore(
    query: string,
    k: number,
    filter?: { types?: string[] },
    scoreThreshold?: number,
  ): Promise<Array<[Document<BaseMetadata>, number]>> {
    const queryVector = await this._embeddingsService.generateEmbeddings(query, {
      concurrencyLimit: 4,
    });

    let qdrantFilter: any;
    if (filter?.types && filter.types.length > 0) {
      if (filter.types.length === 1) {
        // Single type - use must with match
        qdrantFilter = {
          must: [
            {
              key: "metadata.__type",
              match: { value: filter.types[0] },
            },
          ],
        };
      } else {
        // Multiple types - use should (OR condition)
        qdrantFilter = {
          should: filter.types.map((type) => ({
            key: "metadata.__type",
            match: { value: type },
          })),
        };
      }
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
      filter: filter?.types,
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
