import { createHash } from "node:crypto";
import {
  EmbeddingsService,
  type IEmbeddingsService,
  type ISparseVectorService,
  OPTIMAL_CHUNK_OVERLAP,
  OPTIMAL_CHUNK_SIZE,
  type SparseVector,
  getCollectionsNames,
  getEmbeddingModelConfig,
  getSparseVectorService,
} from "@ait/ai-sdk";
import { type ConnectorCursor, type ISyncStateService, SyncStateService } from "@ait/connectors";
import { type EntityType, getLogger } from "@ait/core";
import { drizzleOrm, type getPostgresClient } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";

const logger = getLogger();

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

export type ETLCursor = ConnectorCursor;

/**
 * Configuration for cursor-based ETL operations.
 * Provides the Drizzle table and column references for count/extract queries.
 */
export interface ETLTableConfig {
  /** Drizzle table reference (e.g., spotifyTracks) */
  table: any;
  /** Column reference for updatedAt field (e.g., spotifyTracks.updatedAt) */
  updatedAtField: any;
  /** Column reference for id field (e.g., spotifyTracks.id) */
  idField: any;
}

export abstract class RetoveBaseETLAbstract {
  protected readonly retryOptions: RetryOptions;
  private readonly _batchSize = 100;
  private readonly _vectorSize = embeddingModelConfig.vectorSize;
  protected readonly _transformConcurrency: number = 2;
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
        concurrencyLimit: 1,
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

  protected readonly _progressiveBatchSize: number = 1000;

  public async run(limit: number): Promise<void> {
    try {
      logger.info(`Starting ETL process for collection: ${this._collectionName}. Limit: ${limit}`);
      await this.ensureCollectionExists();

      // Get validated cursor - logic similar to timestamp validation but using cursor object
      let currentCursor = await this._getValidatedCursor();

      if (currentCursor) {
        logger.info(`Processing records after: ${currentCursor.timestamp.toISOString()} (ID > ${currentCursor.id})`);
      } else {
        logger.info("No previous ETL cursor found, processing all records");
      }

      // Calculate total pending items (Delta)
      const pendingCount = await this.count(currentCursor);
      const hasPendingCount = pendingCount !== Number.MAX_SAFE_INTEGER;
      if (hasPendingCount) {
        logger.info(
          `📊 Found ${pendingCount.toLocaleString()} pending items to process (limit: ${limit.toLocaleString()})`,
        );
      } else {
        logger.info(`📊 Processing items in streaming mode (limit: ${limit.toLocaleString()})`);
      }

      let remainingLimit = limit;
      let totalProcessed = 0;
      let batchNumber = 0;

      // Loop as long as we have limit budget AND there are pending items (or if count is partial)
      // If count returns 0, we shouldn't run unless limit > 0 allows discovery (handled by extract length check)
      while (remainingLimit > 0) {
        batchNumber++;
        const batchLimit = Math.min(remainingLimit, this._progressiveBatchSize);
        // Pass the full cursor object to extract
        logger.debug(
          `[ETL Debug] Loop state: remainingLimit=${remainingLimit}, progressiveBatchSize=${this._progressiveBatchSize}, batchLimit=${batchLimit}`,
        );

        const data = await this.extract(batchLimit, currentCursor);

        logger.info(
          `📦 Batch #${batchNumber}: Extracted ${data.length.toLocaleString()} records (Requested: ${batchLimit})`,
        );

        if (data.length === 0) {
          logger.info("No more records to process");
          break;
        }

        const transformedData = await this.transform(data);

        if (data.length > 0 && transformedData.length === 0) {
          logger.warn(
            `⚠️ Batch #${batchNumber}: Extracted ${data.length} items but 0 were transformed (duplicates/filtered). Advancing cursor.`,
          );
          // Do not break; allow cursor update to skip these bad/filtered items
        } else if (transformedData.length > 0) {
          logger.info(`   └─ Transformed: ${transformedData.length.toLocaleString()} vector points`);
        }

        if (data.length > 0) {
          // Determine the new cursor from the *extracted* data (to ensure we move forward past these items)
          const lastItem = data[data.length - 1];
          const newCursor = this.getCursorFromItem(lastItem);

          // Update Sync State with new Cursor and Timestamp
          await this._updateSyncState(newCursor);
          logger.debug(
            `   └─ Cursor updated: ${newCursor.timestamp.toISOString()} (${newCursor.id.substring(0, 20)}...)`,
          );

          currentCursor = newCursor;
        }

        totalProcessed += data.length;
        remainingLimit -= data.length;

        // Show progress
        const progressInfo = hasPendingCount
          ? `${totalProcessed.toLocaleString()}/${pendingCount.toLocaleString()} (${
              pendingCount > 0 ? Math.min(100, Math.round((totalProcessed / pendingCount) * 100)) : 0
            }%)`
          : `${totalProcessed.toLocaleString()} processed (${remainingLimit.toLocaleString()} remaining in limit)`;
        logger.info(`📊 Progress: ${progressInfo}`);
      }

      logger.info(
        `✅ ETL completed for ${this._collectionName}. Total records processed: ${totalProcessed.toLocaleString()}`,
      );
    } catch (error) {
      logger.error(`ETL process failed for collection: ${this._collectionName}`, { error });
      throw error;
    }
  }

  /**
   * Updates the sync state with the new cursor and timestamp.
   * Manually constructs the state to avoid changing ISyncStateService interface for now.
   */
  private async _updateSyncState(cursor: ETLCursor): Promise<void> {
    const entityType = this._getEntityType();
    // Use proper entityType instead of generic "etl"
    let currentState = await this._syncStateService.getState(this._collectionName, entityType);
    if (!currentState) {
      currentState = {
        connectorName: this._collectionName,
        entityType: entityType,
        lastSyncTime: new Date(),
        checksums: {},
      };
    }

    // Always update cursor and timestamp
    currentState.cursor = cursor;
    currentState.lastETLRun = new Date();

    await this._syncStateService.saveState(currentState);
  }

  /**
   * Validates and retrieves the initial cursor.
   */
  private async _getValidatedCursor(): Promise<ETLCursor | undefined> {
    const entityType = this._getEntityType();
    // Use proper entityType instead of generic "etl"
    const syncState = await this._syncStateService.getState(this._collectionName, entityType);

    let cursor: ETLCursor | undefined;

    if (syncState?.cursor) {
      try {
        const rawCursor = syncState.cursor;
        cursor = { timestamp: new Date(rawCursor.timestamp), id: rawCursor.id };
      } catch (e) {
        logger.warn("Failed to parse sync state cursor", { error: e });
      }
    }

    // Validation against Qdrant (similar to before)
    const collectionInfo = await this._getCollectionVectorCount(entityType);
    if (collectionInfo.count === 0) {
      if (cursor) {
        logger.warn("Sync state exists but collection has no vectors. Resetting.");
        await this._syncStateService.clearState(this._collectionName, "etl");
      }
      return undefined;
    }

    return cursor;
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
      logger.warn(`Failed to get collection vector count: ${error}`, { error });
      return { count: 0, latestTimestamp: null };
    }
  }

  /**
   * Get the entity type for this ETL (e.g., "repository", "pull_request", "track").
   * Override in subclasses if needed.
   */
  protected _getEntityType(): EntityType | "unknown" {
    // Default implementation tries to infer from a sample payload
    // Subclasses should override for accuracy
    return "unknown";
  }

  protected async ensureCollectionExists(): Promise<void> {
    const response = await this.retry(() => this._qdrantClient.getCollections());
    const collectionExists = response.collections.some((collection) => collection.name === this._collectionName);
    if (collectionExists) {
      logger.debug(`Collection ${this._collectionName} already exists`);
      return;
    }

    logger.info(`Creating collection: ${this._collectionName}`);
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
        logger.debug(`Created index: ${index.field_name} (${index.field_schema})`);
      } catch (error) {
        // Index may already exist
        logger.debug(`Index ${index.field_name} may already exist: ${error}`, { error });
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
            logger.error(`Error processing item ${i + index}:`, { error });
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
        const processed = Math.min(i + concurrency, data.length);
        logger.debug(`   └─ Upserting: ${batchToLoad.length} points (${processed}/${data.length} items processed)`);
      }

      // Yield to event loop
      await new Promise((resolve) => setImmediate(resolve));
    }

    // Load remaining points
    if (allPoints.length > 0) {
      await this.load(allPoints);
      logger.debug(`Loaded final batch of ${allPoints.length} points`);
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
    logger.info(`Searching in collection ${this._collectionName} with limit ${searchLimit}`);

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
    logger.info(`Generating embedding for the query text: ${queryText.substring(0, 50)}...`);
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
      logger.info(`Retry ${attempt + 1}/${this.retryOptions.maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retry(operation, attempt + 1);
    }
  }

  protected async count(cursor?: ETLCursor): Promise<number> {
    const tableConfig = this._getTableConfig();
    if (!tableConfig) {
      return Number.MAX_SAFE_INTEGER;
    }

    const { table, updatedAtField, idField } = tableConfig;
    const result = await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select({ count: drizzleOrm.count() }).from(table) as any;
      if (cursor) {
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        // This must match the extract() query logic in each vendor ETL
        query = query.where(
          drizzleOrm.and(drizzleOrm.gte(updatedAtField, cursor.timestamp), drizzleOrm.gt(idField, cursor.id)),
        );
      }
      return query.execute();
    });
    const countVal = Number(result[0]?.count ?? 0);
    logger.debug(`[ETL Debug] Count query result: ${countVal} (Cursor: ${cursor ? JSON.stringify(cursor) : "None"})`);
    return countVal;
  }

  protected _getTableConfig(): ETLTableConfig | null {
    return null;
  }
  protected abstract extract(limit: number, cursor?: ETLCursor): Promise<unknown[]>;
  protected abstract getTextForEmbedding(item: Record<string, unknown>): string;
  protected abstract getPayload(item: Record<string, unknown>): Record<string, unknown>;
  protected abstract getCursorFromItem(item: unknown): ETLCursor;
}
