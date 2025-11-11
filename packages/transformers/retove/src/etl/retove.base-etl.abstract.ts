import type { getPostgresClient } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { EmbeddingsService, getEmbeddingModelConfig, type IEmbeddingsService, getCollectionsNames } from "@ait/ai-sdk";

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

const embeddingModelConfig = getEmbeddingModelConfig();

export abstract class RetoveBaseETLAbstract {
  protected readonly retryOptions: RetryOptions;
  private readonly _batchSize = 1000;
  private readonly _vectorSize = embeddingModelConfig.vectorSize;
  protected readonly _transformConcurrency: number = 10;
  protected readonly _batchUpsertConcurrency: number = 5;
  protected readonly _queryEmbeddingCache: Map<string, number[]> = new Map();

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
      embeddingModelConfig.name,
      embeddingModelConfig.vectorSize,
      {
        concurrencyLimit: 2,
        chunkSize: 128,
        weightChunks: true,
      },
    ),
  ) {
    this.retryOptions = retryOptions;
    this.validateCollectionName(_collectionName);
  }

  private validateCollectionName(collectionName: string): void {
    const validCollections = getCollectionsNames();
    if (!validCollections.includes(collectionName)) {
      throw new Error(`Invalid collection name: ${collectionName}. Must be one of: ${validCollections.join(", ")}`);
    }
  }

  public async run(limit: number): Promise<void> {
    try {
      console.info(`Starting ETL process for collection: ${this._collectionName}. Limit: ${limit}`);
      await this.ensureCollectionExists();
      const data = await this.extract(limit);
      const transformedData = await this.transform(data);
      await this.load(transformedData);
      console.info(`ETL process completed successfully for collection: ${this._collectionName}`);
    } catch (error) {
      console.error(`ETL process failed for collection: ${this._collectionName}`, error);
      throw error;
    }
  }

  protected async ensureCollectionExists(): Promise<void> {
    const response = await this.retry(() => this._qdrantClient.getCollections());
    const collectionExists = response.collections.some((collection) => collection.name === this._collectionName);
    if (collectionExists) {
      console.debug(`Collection ${this._collectionName} already exists`);
      return;
    }

    console.info(`Creating collection: ${this._collectionName}`);
    // Remove 'init_from' to avoid attempting to initialize from a non-existent collection.
    await this.retry(() =>
      this._qdrantClient.createCollection(this._collectionName, {
        vectors: {
          size: this._vectorSize,
          distance: "Cosine",
        },
        optimizers_config: {
          default_segment_number: 4,
          indexing_threshold: 10000,
          memmap_threshold: 100000,
          payload_indexing_threshold: 5000,
        },
        replication_factor: 1,
        write_consistency_factor: 1,
        on_disk_payload: true,
        hnsw_config: {
          m: 16,
          ef_construct: 200,
          full_scan_threshold: 5000,
        },
        quantization_config: {
          scalar: {
            type: "int8",
            always_ram: true,
            quantile: 0.99,
          },
        },
        sparse_vectors: {
          text_embedding: {
            index: {
              on_disk: true,
              full_scan_threshold: 5000,
            },
          },
        },
      }),
    );

    await this.retry(() =>
      this._qdrantClient.createPayloadIndex(this._collectionName, {
        field_name: "metadata.__type",
        field_schema: "keyword",
      }),
    );

    await this.retry(() =>
      this._qdrantClient.createPayloadIndex(this._collectionName, {
        field_name: "metadata.timestamp",
        field_schema: "datetime",
      }),
    );
  }

  protected async transform<T>(data: T[]): Promise<BaseVectorPoint[]> {
    const points: BaseVectorPoint[] = [];
    const BATCH_SIZE = 50;
    const concurrency = this._transformConcurrency;
    const loadTasks: Promise<void>[] = [];

    for (let i = 0; i < data.length; i += concurrency) {
      const chunk = data.slice(i, i + concurrency);
      const results = await Promise.all(
        chunk.map(async (item, index) => {
          try {
            const text = this.getTextForEmbedding(item as Record<string, unknown>);
            const correlationId = `retove-${this._collectionName}-${i + index + 1}`;
            // Split text into smaller chunks that respect the model's context limit
            // mxbai-embed-large has a 512 token limit, so we use 128 chars to be very safe
            // (128 chars ≈ 25-32 tokens, well below the 512 token limit)
            const textChunks = this._splitTextIntoChunks(text, 128);
            const chunkVectors = await Promise.all(
              textChunks.map(async (textChunk, chunkIndex) => {
                const vector = await this._embeddingsService.generateEmbeddings(textChunk, {
                  correlationId: `${correlationId}-chunk-${chunkIndex}`,
                });
                if (vector.length !== this._vectorSize) {
                  throw new Error(`Invalid vector size: ${vector.length}. Expected: ${this._vectorSize}`);
                }
                return { vector, text: textChunk, chunkIndex };
              }),
            );

            const payloadObj = {
              ...this.getPayload(item as Record<string, unknown>),
              originalText: text,
              chunks: textChunks,
              timestamp: new Date().toISOString(),
              source: this._collectionName,
              version: "1.0",
            } as ReturnType<typeof this.getPayload>;

            const baseOffset = this.getIdBaseOffset();
            return chunkVectors.map((chunkVector) => {
              const chunkFormatted = chunkVector.text.replace(/{/g, "{{").replace(/}/g, "}}");
              const entityId = String((item as any).id || i + index);

              return {
                id: baseOffset + this._generateStableId(entityId, chunkVector.chunkIndex),
                vector: chunkVector.vector,
                payload: {
                  content: chunkFormatted,
                  chunk_index: chunkVector.chunkIndex,
                  total_chunks: textChunks.length,
                  metadata: {
                    ...payloadObj,
                    __source: "retove",
                    __type: payloadObj.__type,
                    __collection: this._collectionName,
                    __chunk_info: {
                      index: chunkVector.chunkIndex,
                      total: textChunks.length,
                      correlation_id: correlationId,
                    },
                  },
                },
              };
            });
          } catch (error) {
            console.error(`Error processing item ${i + index}:`, error);
            return null;
          }
        }),
      );

      for (const result of results) {
        if (result) {
          points.push(...result);
        }
      }

      while (points.length >= BATCH_SIZE) {
        const batch = points.splice(0, BATCH_SIZE);
        loadTasks.push(this.load(batch));
      }

      await new Promise((resolve) => setImmediate(resolve));
    }

    if (points.length > 0) {
      loadTasks.push(this.load(points));
    }

    await Promise.all(loadTasks);
    if (global.gc) {
      console.debug("Running garbage collection");
      global.gc();
    }

    return points;
  }

  private _splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const entities = text.split(/(?=\{\"id\")/g);
    const chunks: string[] = [];

    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const entity of entities) {
      if (entity.length > maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(""));
          currentChunk = [];
          currentLength = 0;
        }

        for (let i = 0; i < entity.length; i += maxChunkSize) {
          chunks.push(entity.slice(i, i + maxChunkSize));
        }
        continue;
      }

      if (currentLength + entity.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.join(""));
        currentChunk = [];
        currentLength = 0;
      }
      currentChunk.push(entity);
      currentLength += entity.length;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(""));
    }

    return chunks;
  }

  protected async load(data: unknown[]): Promise<void> {
    const points = data as BaseVectorPoint[];
    const tasks: Array<() => Promise<void>> = [];
    for (let i = 0; i < points.length; i += this._batchSize) {
      const batch = points.slice(i, i + this._batchSize);
      tasks.push(async () => {
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
      });
    }

    for (let i = 0; i < tasks.length; i += this._batchUpsertConcurrency) {
      const chunkTasks = tasks.slice(i, i + this._batchUpsertConcurrency).map((task) => task());
      await Promise.all(chunkTasks);
    }
  }

  public async search(
    queryVector: number[],
    searchLimit: number,
    filter?: Record<string, unknown>,
  ): Promise<BaseVectorPoint[]> {
    console.info(`Searching in collection ${this._collectionName} with limit ${searchLimit}`);

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
      score_threshold: 0.7,
    };

    const result = await this._qdrantClient.search(this._collectionName, searchParams);

    return result.map((hit) => ({
      id: hit.id as number,
      vector: hit.vector || [],
      payload: {
        ...hit.payload,
        _score: hit.score,
      },
    })) as BaseVectorPoint[];
  }

  public async searchByText(
    queryText: string,
    searchLimit: number,
    filter?: Record<string, unknown>,
  ): Promise<BaseVectorPoint[]> {
    console.info(`Generating embedding for the query text: ${queryText.substring(0, 50)}...`);
    let queryVector = this.getCachedQuery(queryText);
    if (!queryVector) {
      queryVector = await this._embeddingsService.generateEmbeddings(queryText, {
        correlationId: `search-${new Date().toISOString()}`,
      });
      this.cacheQuery(queryText, queryVector);
    }
    if (queryVector.length !== this._vectorSize) {
      throw new Error(`Invalid query vector size: ${queryVector.length}. Expected: ${this._vectorSize}`);
    }
    return this.search(queryVector, searchLimit, filter);
  }

  private _generateStableId(entityId: string, chunkIndex: number): number {
    const input = `${entityId}-chunk-${chunkIndex}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return Math.abs(hash);
  }

  protected getCachedQuery(queryText: string): number[] | undefined {
    return this._queryEmbeddingCache.get(queryText);
  }

  protected cacheQuery(queryText: string, vector: number[]): void {
    this._queryEmbeddingCache.set(queryText, vector);
  }

  protected async retry<T>(operation: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.retryOptions.maxRetries) {
        throw error;
      }
      const delay = Math.min(this.retryOptions.initialDelay * 2 ** attempt, this.retryOptions.maxDelay);
      console.info(`Retry ${attempt + 1}/${this.retryOptions.maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retry(operation, attempt + 1);
    }
  }

  protected abstract extract(limit: number): Promise<unknown[]>;
  protected abstract getTextForEmbedding(item: Record<string, unknown>): string;
  protected abstract getPayload(item: Record<string, unknown>): Record<string, unknown>;
  /**
   * Returns a large numeric offset that namespaces point IDs per ETL implementation,
   * ensuring uniqueness when multiple ETLs share a single collection.
   */
  protected getIdBaseOffset(): number {
    return 0;
  }
}
