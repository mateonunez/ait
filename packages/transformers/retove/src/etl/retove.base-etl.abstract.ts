import type { getPostgresClient } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import {
  EmbeddingsService,
  DEFAULT_LANGCHAIN_MODEL,
  LANGCHAIN_VECTOR_SIZE,
  type IEmbeddingsService,
} from "@ait/langchain";

export interface BaseVectorPoint {
  id: number;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
}

export abstract class RetoveBaseETLAbstract {
  protected readonly retryOptions: RetryOptions;
  private readonly _batchSize = 100;
  private readonly _vectorSize = LANGCHAIN_VECTOR_SIZE;

  constructor(
    protected readonly _pgClient: ReturnType<typeof getPostgresClient>,
    protected readonly _qdrantClient: qdrant.QdrantClient,
    private readonly _collectionName: string,
    retryOptions: RetryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
    },
    private readonly _embeddingsService: IEmbeddingsService = new EmbeddingsService(
      DEFAULT_LANGCHAIN_MODEL,
      LANGCHAIN_VECTOR_SIZE,
    ),
  ) {
    this.retryOptions = retryOptions;
  }

  public async run(limit: number): Promise<void> {
    try {
      console.log(`Starting ETL process. Limit: ${limit}`);
      await this.ensureCollectionExists();
      const data = await this.extract(limit);
      const transformedData = await this.transform(data);
      await this.load(transformedData);
      console.log("ETL process completed successfully");
    } catch (error) {
      console.error("ETL process failed:", error);
      throw error;
    }
  }

  protected async ensureCollectionExists(): Promise<void> {
    const response = await this.retry(() => this._qdrantClient.getCollections());
    const collectionExists = response.collections.some((collection) => collection.name === this._collectionName);

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

  protected async transform<T>(data: T[]): Promise<BaseVectorPoint[]> {
    const items = data as Record<string, unknown>[];
    const points: BaseVectorPoint[] = [];

    for (const [index, item] of items.entries()) {
      const text = this.getTextForEmbedding(item);

      const vector = await this._embeddingsService.generateEmbeddings(text);
      if (vector.length !== this._vectorSize) {
        throw new Error(`Invalid vector size: ${vector.length}. Expected: ${this._vectorSize}`);
      }

      const payload = this.getPayload(item);

      points.push({
        id: index + 1,
        vector,
        payload: {
          content: `${payload.name} ${payload.description} ${payload.language}`,
          metadata: {
            source: "retove",
          },
        },
      });
    }

    console.log("from transform", points);

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

  protected async retry<T>(operation: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.retryOptions.maxRetries) {
        throw error;
      }
      // Calculate the next delay using exponential backoff, capping at maxDelay.
      const delay = Math.min(this.retryOptions.initialDelay * 2 ** attempt, this.retryOptions.maxDelay);

      console.log(`Retry ${attempt + 1}/${this.retryOptions.maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.retry(operation, attempt + 1);
    }
  }

  protected abstract extract(limit: number): Promise<unknown[]>;
  protected abstract getTextForEmbedding(item: Record<string, unknown>): string;
  protected abstract getPayload(item: Record<string, unknown>): Record<string, unknown>;
}
