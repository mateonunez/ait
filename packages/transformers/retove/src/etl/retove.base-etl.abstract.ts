import type { getPostgresClient } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import {
  EmbeddingsService,
  getEmbeddingModelConfig,
  type IEmbeddingsService,
  getCollectionsNames,
  OPTIMAL_CHUNK_SIZE,
  OPTIMAL_CHUNK_OVERLAP,
  getSparseVectorService,
  type ISparseVectorService,
  type SparseVector,
} from "@ait/ai-sdk";
import { SyncStateService, type ISyncStateService } from "@ait/connectors";
import { createHash } from "node:crypto";

export interface BaseVectorPoint {
  id: string;
  vector: number[];
  sparseVector?: SparseVector;
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
  private readonly _batchSize = 100;
  private readonly _vectorSize = embeddingModelConfig.vectorSize;
  protected readonly _transformConcurrency: number = 5;
  protected readonly _batchUpsertConcurrency: number = 3;
  protected readonly _queryEmbeddingCache: Map<string, number[]> = new Map();
  protected readonly _syncStateService: ISyncStateService = new SyncStateService();
  protected readonly _sparseVectorService: ISparseVectorService = getSparseVectorService();
  protected readonly _enableHybridSearch: boolean = true;

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
        // Use optimal chunk size from central config (single source of truth)
        chunkSize: OPTIMAL_CHUNK_SIZE,
        chunkOverlap: OPTIMAL_CHUNK_OVERLAP,
        concurrencyLimit: 2,
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

      // Get validated timestamp - checks actual vectors in collection vs sync state
      const lastProcessedTimestamp = await this._getValidatedLastTimestamp();

      if (lastProcessedTimestamp) {
        console.info(`Processing records updated after: ${lastProcessedTimestamp.toISOString()}`);
      } else {
        console.info("No previous ETL run found, processing all records");
      }

      const data = await this.extract(limit, lastProcessedTimestamp);
      console.info(`Extracted ${data.length} records from source`);

      if (data.length === 0) {
        console.info("No records to process");
        return;
      }

      const transformedData = await this.transform(data);
      console.info(`Transformed ${transformedData.length} vector points`);

      if (data.length > 0) {
        const latestTimestamp = this.getLatestTimestamp(data);
        await this._syncStateService.updateETLTimestamp(this._collectionName, "etl", latestTimestamp);
        console.info(`Updated last processed timestamp to: ${latestTimestamp.toISOString()}`);
      }

      console.info(`✅ ETL process completed successfully for collection: ${this._collectionName}`);
    } catch (error) {
      console.error(`ETL process failed for collection: ${this._collectionName}`, error);
      throw error;
    }
  }

  /**
   * Get validated last processed timestamp by checking:
   * 1. Sync state from database
   * 2. Actual vectors in collection (reality check)
   *
   * If sync state exists but collection is empty/has no matching vectors,
   * reset sync state to process all records.
   */
  private async _getValidatedLastTimestamp(): Promise<Date | undefined> {
    const entityType = this._getEntityType();
    const syncState = await this._syncStateService.getState(this._collectionName, "etl");
    const syncTimestamp = syncState?.lastProcessedTimestamp;

    // Check actual collection state
    const collectionInfo = await this._getCollectionVectorCount(entityType);

    // If collection has no vectors for this entity type, reset sync state
    if (collectionInfo.count === 0) {
      if (syncTimestamp) {
        console.warn(
          `Sync state exists (${syncTimestamp.toISOString()}) but collection has no vectors for type '${entityType}'. Resetting to process all records.`,
        );
        await this._syncStateService.clearState(this._collectionName, "etl");
      }
      return undefined;
    }

    // If sync state exists, validate against actual latest vector timestamp
    if (syncTimestamp && collectionInfo.latestTimestamp) {
      const actualLatest = new Date(collectionInfo.latestTimestamp);

      // If sync state is significantly newer than actual vectors, something is wrong
      // Use the actual latest timestamp from vectors instead
      if (syncTimestamp > actualLatest) {
        console.warn(
          `Sync state (${syncTimestamp.toISOString()}) is newer than latest vector (${actualLatest.toISOString()}). Using actual vector timestamp.`,
        );
        return actualLatest;
      }
    }

    return syncTimestamp;
  }

  /**
   * Get count and latest timestamp of vectors in collection for this entity type.
   */
  private async _getCollectionVectorCount(
    entityType: string,
  ): Promise<{ count: number; latestTimestamp: string | null }> {
    try {
      // Count vectors of this entity type
      const countResult = await this._qdrantClient.count(this._collectionName, {
        filter: {
          must: [
            {
              key: "metadata.__type",
              match: { value: entityType },
            },
          ],
        },
        exact: true,
      });

      if (countResult.count === 0) {
        return { count: 0, latestTimestamp: null };
      }

      // Get the latest indexed timestamp by scrolling with sort
      const scrollResult = await this._qdrantClient.scroll(this._collectionName, {
        filter: {
          must: [
            {
              key: "metadata.__type",
              match: { value: entityType },
            },
          ],
        },
        limit: 1,
        with_payload: true,
        order_by: {
          key: "metadata.__indexed_at",
          direction: "desc",
        },
      });

      const latestPoint = scrollResult.points[0];
      const latestTimestamp =
        (latestPoint?.payload as Record<string, unknown>)?.metadata &&
        typeof (latestPoint?.payload as Record<string, unknown>).metadata === "object"
          ? ((latestPoint?.payload as Record<string, unknown>).metadata as Record<string, unknown>).__indexed_at
          : null;

      return {
        count: countResult.count,
        latestTimestamp: latestTimestamp as string | null,
      };
    } catch (error) {
      console.warn(`Failed to get collection vector count: ${error}`);
      return { count: 0, latestTimestamp: null };
    }
  }

  /**
   * Get the entity type for this ETL (e.g., "repository", "pull_request", "track").
   * Override in subclasses if needed.
   */
  protected _getEntityType(): string {
    // Default implementation tries to infer from a sample payload
    // Subclasses should override for accuracy
    return "unknown";
  }

  protected async ensureCollectionExists(): Promise<void> {
    const response = await this.retry(() => this._qdrantClient.getCollections());
    const collectionExists = response.collections.some((collection) => collection.name === this._collectionName);
    if (collectionExists) {
      console.debug(`Collection ${this._collectionName} already exists`);
      return;
    }

    console.info(`Creating collection: ${this._collectionName}`);
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

    // Create core indexes
    await this._createPayloadIndexes();
  }

  /**
   * Create payload indexes for efficient filtering.
   * Override in subclasses to add entity-specific indexes.
   */
  protected async _createPayloadIndexes(): Promise<void> {
    // Core indexes for all collections
    const coreIndexes: Array<{
      field_name: string;
      field_schema: "keyword" | "datetime" | "integer" | "float" | "bool" | "text";
    }> = [
      { field_name: "metadata.__type", field_schema: "keyword" },
      { field_name: "metadata.id", field_schema: "keyword" },
      { field_name: "metadata.__indexed_at", field_schema: "datetime" },
    ];

    // Add collection-specific indexes
    const collectionIndexes = this._getCollectionSpecificIndexes();

    const allIndexes = [...coreIndexes, ...collectionIndexes];

    for (const index of allIndexes) {
      try {
        await this.retry(() =>
          this._qdrantClient.createPayloadIndex(this._collectionName, {
            field_name: index.field_name,
            field_schema: index.field_schema,
          }),
        );
        console.debug(`Created index: ${index.field_name} (${index.field_schema})`);
      } catch (error) {
        // Index may already exist
        console.debug(`Index ${index.field_name} may already exist: ${error}`);
      }
    }
  }

  /**
   * Override in subclasses to provide collection-specific indexes.
   */
  protected _getCollectionSpecificIndexes(): Array<{
    field_name: string;
    field_schema: "keyword" | "datetime" | "integer" | "float" | "bool" | "text";
  }> {
    return [];
  }

  /**
   * Transform entities to vector points.
   * Uses streaming batch processing to avoid memory issues.
   */
  protected async transform<T>(data: T[]): Promise<BaseVectorPoint[]> {
    const allPoints: BaseVectorPoint[] = [];
    const concurrency = this._transformConcurrency;

    for (let i = 0; i < data.length; i += concurrency) {
      const chunk = data.slice(i, i + concurrency);
      const results = await Promise.all(
        chunk.map(async (item, index) => {
          try {
            return await this._transformSingleEntity(item as Record<string, unknown>, i + index);
          } catch (error) {
            console.error(`Error processing item ${i + index}:`, error);
            return null;
          }
        }),
      );

      // Collect successful results
      const successfulPoints = results.filter((r): r is BaseVectorPoint => r !== null);
      allPoints.push(...successfulPoints);

      // Stream load in batches to avoid memory buildup
      if (allPoints.length >= this._batchSize) {
        const batchToLoad = allPoints.splice(0, this._batchSize);
        await this.load(batchToLoad);
        console.debug(`Loaded batch of ${batchToLoad.length} points, ${data.length - i - concurrency} remaining`);
      }

      // Yield to event loop
      await new Promise((resolve) => setImmediate(resolve));
    }

    // Load remaining points
    if (allPoints.length > 0) {
      await this.load(allPoints);
      console.debug(`Loaded final batch of ${allPoints.length} points`);
    }

    return allPoints;
  }

  /**
   * Transform a single entity to a vector point.
   * Embeddings service handles chunking internally.
   * Generates both dense and sparse vectors for hybrid search.
   */
  private async _transformSingleEntity(item: Record<string, unknown>, index: number): Promise<BaseVectorPoint> {
    const text = this.getTextForEmbedding(item);
    const entityId = String(item.id || `entity-${index}`);
    const correlationId = `retove-${this._collectionName}-${entityId}`;

    // Generate dense embedding - chunking is handled by EmbeddingsService
    const vector = await this._embeddingsService.generateEmbeddings(text, {
      correlationId,
    });

    if (vector.length !== this._vectorSize) {
      throw new Error(`Invalid vector size: ${vector.length}. Expected: ${this._vectorSize}`);
    }

    // Generate sparse vector for hybrid search
    let sparseVector: SparseVector | undefined;
    if (this._enableHybridSearch) {
      sparseVector = this._sparseVectorService.generateSparseVector(text);
    }

    const payloadObj = this.getPayload(item);

    // Generate deterministic UUID for this entity
    const pointId = this._generateDeterministicId(this._collectionName, entityId);

    return {
      id: pointId,
      vector,
      sparseVector,
      payload: {
        content: text,
        metadata: {
          ...payloadObj,
          id: entityId,
          __source: "retove",
          __type: payloadObj.__type,
          __collection: this._collectionName,
          __indexed_at: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Generate a deterministic UUID v5-style ID based on namespace and entity ID.
   * This ensures the same entity always gets the same ID (for upserts).
   */
  private _generateDeterministicId(collection: string, entityId: string): string {
    const input = `${collection}:${entityId}`;
    const hash = createHash("sha256").update(input).digest("hex");
    // Format as UUID-like string for Qdrant compatibility
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  protected async load(data: BaseVectorPoint[]): Promise<void> {
    if (data.length === 0) return;

    const tasks: Array<() => Promise<void>> = [];
    for (let i = 0; i < data.length; i += this._batchSize) {
      const batch = data.slice(i, i + this._batchSize);
      tasks.push(async () => {
        const upsertPoints = batch.map((point) => {
          const basePoint: {
            id: string;
            vector: number[] | Record<string, number[] | { indices: number[]; values: number[] }>;
            payload: Record<string, unknown>;
          } = {
            id: point.id,
            vector: point.vector,
            payload: point.payload,
          };

          // Add sparse vector for hybrid search if available
          if (point.sparseVector && point.sparseVector.indices.length > 0) {
            basePoint.vector = {
              "": point.vector, // Default dense vector
              text_embedding: {
                indices: point.sparseVector.indices,
                values: point.sparseVector.values,
              },
            };
          }

          return basePoint;
        });

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
        correlationId: `search-${Date.now()}`,
      });
      this.cacheQuery(queryText, queryVector);
    }
    if (queryVector.length !== this._vectorSize) {
      throw new Error(`Invalid query vector size: ${queryVector.length}. Expected: ${this._vectorSize}`);
    }
    return this.search(queryVector, searchLimit, filter);
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

  protected abstract extract(limit: number, lastProcessedTimestamp?: Date): Promise<unknown[]>;
  protected abstract getTextForEmbedding(item: Record<string, unknown>): string;
  protected abstract getPayload(item: Record<string, unknown>): Record<string, unknown>;
  protected abstract getLatestTimestamp(data: unknown[]): Date;
}
