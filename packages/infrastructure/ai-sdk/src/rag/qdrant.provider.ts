import { getQdrantClient, type qdrant } from "@ait/qdrant";
import { EmbeddingsService } from "../services/embeddings/embeddings.service";
import type { IEmbeddingsService } from "../services/embeddings/embeddings.service";
import { getEmbeddingModelConfig } from "../client/ai-sdk.client";

export interface Document {
  pageContent: string;
  metadata: Record<string, unknown>;
}

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

  async similaritySearch(query: string, k: number): Promise<Document[]> {
    const queryVector = await this._embeddingsService.generateEmbeddings(query, {
      concurrencyLimit: 4,
    });

    const searchResult = await this._client.search(this._config.collectionName, {
      vector: queryVector,
      limit: k,
      with_payload: true,
    });

    return searchResult.map((point) => ({
      pageContent: (point.payload?.text as string) || (point.payload?.pageContent as string) || "",
      metadata: point.payload || {},
    }));
  }

  async similaritySearchWithScore(query: string, k: number): Promise<Array<[Document, number]>> {
    const queryVector = await this._embeddingsService.generateEmbeddings(query, {
      concurrencyLimit: 4,
    });

    const searchResult = await this._client.search(this._config.collectionName, {
      vector: queryVector,
      limit: k,
      with_payload: true,
      score_threshold: 0.0,
    });

    return searchResult.map((point) => [
      {
        pageContent: (point.payload?.text as string) || (point.payload?.pageContent as string) || "",
        metadata: point.payload || {},
      },
      point.score,
    ]);
  }

  reset(): void {
    // No-op since we're using a stateless client
  }
}
