import type { getPostgresClient } from "@ait/postgres";
import { AbstractETL, type BaseVectorPoint, type RetryOptions } from "./etl.abstract";
import type { qdrant } from "@ait/qdrant";
import { ETLEmbeddingsService, type IEmbeddingsService } from "../infrastructure/embeddings/etl.embeddings.service";

export class ETLBase extends AbstractETL {
  private readonly _batchSize = 100;
  private readonly _vectorSize = 2048;

  constructor(
    protected readonly _pgClient: ReturnType<typeof getPostgresClient>,
    protected readonly _qdrantClient: qdrant.QdrantClient,
    private readonly _collectionName: string,
    retryOptions: RetryOptions = { maxRetries: 3, initialDelay: 1000, maxDelay: 5000 },
    private readonly _embeddingsService: IEmbeddingsService = new ETLEmbeddingsService("gemma:2b", 2048),
  ) {
    super(retryOptions);
  }

  protected async ensureCollectionExists(): Promise<void> {
    const collections = await this.retry(() => this._qdrantClient.getCollections());
    const collectionExists = collections.collections.some((collection) => collection.name === this._collectionName);

    if (collectionExists) {
      console.log(`Deleting existing collection: ${this._collectionName}`);
      await this.retry(() => this._qdrantClient.deleteCollection(this._collectionName));
    }

    console.log(`Creating collection: ${this._collectionName}`);
    await this.retry(() =>
      this._qdrantClient.createCollection(this._collectionName, {
        vectors: {
          size: this._vectorSize,
          distance: "Cosine",
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      }),
    );
  }

  protected async extract(limit: number): Promise<unknown[]> {
    // This should be overridden by specific ETL implementations
    throw new Error("Extract method must be implemented by subclass");
  }

  protected async transform(data: unknown[]): Promise<BaseVectorPoint[]> {
    const items = data as Record<string, unknown>[];
    const points: BaseVectorPoint[] = [];

    for (const [index, item] of items.entries()) {
      const text = this.getTextForEmbedding(item);
      const vector = await this._embeddingsService.generateEmbeddings(text);

      if (vector.length !== this._vectorSize) {
        throw new Error(`Invalid vector size: ${vector.length}. Expected: ${this._vectorSize}`);
      }

      points.push({
        id: index + 1,
        vector,
        payload: this.getPayload(item),
      } as BaseVectorPoint);
    }

    return points;
  }

  protected async load(data: unknown[]): Promise<void> {
    const points = data as BaseVectorPoint[];
    for (let i = 0; i < points.length; i += this._batchSize) {
      const batch = points.slice(i, i + this._batchSize);
      const upsertPoints = batch.map((point) => ({
        id: point.id,
        vector: point.vector,
        payload: point.payload,
      }));

      await this.retry(async () => {
        await this._qdrantClient.upsert(this._collectionName, {
          wait: true,
          points: upsertPoints,
        });
      });
    }
  }

  protected getTextForEmbedding(item: Record<string, unknown>): string {
    throw new Error("getTextForEmbedding must be implemented by subclass");
  }

  protected getPayload(item: Record<string, unknown>): Record<string, unknown> {
    throw new Error("getPayload must be implemented by subclass");
  }
}
