import { createHash } from "node:crypto";
import {
  EmbeddingsService,
  type IEmbeddingsService,
  type ISparseVectorService,
  OPTIMAL_CHUNK_OVERLAP,
  OPTIMAL_CHUNK_SIZE,
  type SparseVector,
  getCollectionVendorByName,
  getEmbeddingModelConfig,
  getSparseVectorService,
} from "@ait/ai-sdk";
import { connectorGrantService } from "@ait/connectors";
import { type ConnectorCursor, type ISyncStateService, SyncStateService } from "@ait/connectors";
import { type EntityType, getLogger } from "@ait/core";
import { drizzleOrm, type getPostgresClient } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  EnrichmentResult,
  IETLEmbeddingDescriptor,
} from "../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLCollectionManager, ETLVectorLoader, ETLVectorSearcher } from "./helpers";
import type { BaseVectorPoint, PayloadIndex, RetryOptions } from "./retove.etl.types";

export type { BaseVectorPoint, RetryOptions } from "./retove.etl.types";
export type ETLCursor = ConnectorCursor;
export interface ETLTableConfig {
  table: drizzleOrm.Table<any>;
  updatedAtField: drizzleOrm.Column<any>;
  idField: drizzleOrm.Column<any>;
}

const embeddingModelConfig = getEmbeddingModelConfig();

export abstract class RetoveBaseETLAbstract<T> {
  protected readonly _logger = getLogger();
  protected abstract readonly _descriptor: IETLEmbeddingDescriptor<T>;
  protected readonly retryOptions: RetryOptions;
  private readonly _batchSize = 100;
  private readonly _vectorSize = embeddingModelConfig.vectorSize ?? 4096;
  protected readonly _transformConcurrency: number = 2;
  protected readonly _batchUpsertConcurrency: number = 3;
  protected readonly _syncStateService: ISyncStateService = new SyncStateService();
  protected readonly _sparseVectorService: ISparseVectorService = getSparseVectorService();
  protected readonly _enableHybridSearch: boolean = true;
  protected readonly _enableAIEnrichment: boolean = true;
  protected readonly _progressiveBatchSize: number = 1000;

  // Helper instances (composition over inheritance)
  private readonly _collectionManager: ETLCollectionManager;
  private readonly _vectorLoader: ETLVectorLoader;
  private readonly _vectorSearcher: ETLVectorSearcher;

  constructor(
    protected readonly _pgClient: ReturnType<typeof getPostgresClient>,
    protected readonly _qdrantClient: qdrant.QdrantClient,
    protected readonly _collectionName: string,
    retryOptions: RetryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
    },
    protected readonly _embeddingsService: IEmbeddingsService = new EmbeddingsService(
      embeddingModelConfig.name,
      embeddingModelConfig.vectorSize ?? 4096,
      {
        chunkSize: OPTIMAL_CHUNK_SIZE,
        chunkOverlap: OPTIMAL_CHUNK_OVERLAP,
        concurrencyLimit: 1,
        weightChunks: true,
      },
    ),
  ) {
    this.retryOptions = retryOptions;

    // Initialize helper instances with bound retry function
    const boundRetry = this.retry.bind(this);

    this._collectionManager = new ETLCollectionManager(_qdrantClient, _collectionName, this._vectorSize, boundRetry);

    this._vectorLoader = new ETLVectorLoader(
      _qdrantClient,
      _collectionName,
      this._batchSize,
      this._batchUpsertConcurrency,
      boundRetry,
    );

    this._vectorSearcher = new ETLVectorSearcher(
      _qdrantClient,
      _collectionName,
      this._vectorSize,
      _embeddingsService,
      () => this._getEntityType(),
    );
  }

  public async run(limit: number): Promise<void> {
    try {
      // Grant check
      const vendor = getCollectionVendorByName(this._collectionName);
      if (vendor && vendor !== "general" && vendor !== "google-calendar" && vendor !== "youtube") {
        const isGranted = await connectorGrantService.isGranted(vendor);
        if (!isGranted) {
          this._logger.warn(
            `⛔ Skipping ETL for ${this._collectionName} because vendor ${vendor} is disabled globally.`,
          );
          return;
        }
      }

      this._logger.info(`Starting ETL process for collection: ${this._collectionName}. Limit: ${limit}`);
      await this.ensureCollectionExists();

      let currentCursor = await this._getValidatedCursor();

      if (currentCursor) {
        this._logger.info(
          `Processing records after: ${currentCursor.timestamp.toISOString()} (ID > ${currentCursor.id})`,
        );
      } else {
        this._logger.info("No previous ETL cursor found, processing all records");
      }

      const pendingCount = await this.count(currentCursor);
      const hasPendingCount = pendingCount !== Number.MAX_SAFE_INTEGER;
      if (hasPendingCount) {
        this._logger.info(
          `📊 Found ${pendingCount.toLocaleString()} pending items to process (limit: ${limit.toLocaleString()})`,
        );
      } else {
        this._logger.info(`📊 Processing items in streaming mode (limit: ${limit.toLocaleString()})`);
      }

      let remainingLimit = limit;
      let totalProcessed = 0;
      let batchNumber = 0;

      while (remainingLimit > 0) {
        batchNumber++;
        const batchLimit = Math.min(remainingLimit, this._progressiveBatchSize);
        this._logger.debug(
          `[ETL Debug] Loop state: remainingLimit=${remainingLimit}, progressiveBatchSize=${this._progressiveBatchSize}, batchLimit=${batchLimit}`,
        );

        const data = await this.extract(batchLimit, currentCursor);

        this._logger.info(
          `📦 Batch #${batchNumber}: Extracted ${data.length.toLocaleString()} records (Requested: ${batchLimit})`,
        );

        if (data.length === 0) {
          this._logger.info("No more records to process");
          break;
        }

        const transformedData = await this.transform(data);

        if (data.length > 0 && transformedData.length === 0) {
          this._logger.warn(
            `⚠️ Batch #${batchNumber}: Extracted ${data.length} items but 0 were transformed (duplicates/filtered). Advancing cursor.`,
          );
        } else if (transformedData.length > 0) {
          this._logger.info(`   └─ Transformed: ${transformedData.length.toLocaleString()} vector points`);
        }

        if (data.length > 0) {
          const lastItem = data[data.length - 1];
          const newCursor = this.getCursorFromItem(lastItem);

          await this._updateSyncState(newCursor);
          this._logger.debug(
            `   └─ Cursor updated: ${newCursor.timestamp.toISOString()} (${newCursor.id.substring(0, 20)}...)`,
          );

          currentCursor = newCursor;
        }

        totalProcessed += data.length;
        remainingLimit -= data.length;

        const progressInfo = hasPendingCount
          ? `${totalProcessed.toLocaleString()}/${pendingCount.toLocaleString()} (${
              pendingCount > 0 ? Math.min(100, Math.round((totalProcessed / pendingCount) * 100)) : 0
            }%)`
          : `${totalProcessed.toLocaleString()} processed (${remainingLimit.toLocaleString()} remaining in limit)`;
        this._logger.info(`📊 Progress: ${progressInfo}`);
      }

      this._logger.info(
        `✅ ETL completed for ${this._collectionName}. Total records processed: ${totalProcessed.toLocaleString()}`,
      );
    } catch (error) {
      this._logger.error(`ETL process failed for collection: ${this._collectionName}`, { error });
      throw error;
    }
  }

  protected async ensureCollectionExists(): Promise<void> {
    await this._collectionManager.ensureCollectionExists();
    await this._createPayloadIndexes();
  }

  protected async _createPayloadIndexes(): Promise<void> {
    const collectionIndexes = this._getCollectionSpecificIndexes();
    await this._collectionManager.createPayloadIndexes(collectionIndexes);
  }

  protected _getCollectionSpecificIndexes(): PayloadIndex[] {
    return [];
  }

  private async _updateSyncState(cursor: ETLCursor): Promise<void> {
    const entityType = this._getEntityType();
    let currentState = await this._syncStateService.getState(this._collectionName, entityType);
    if (!currentState) {
      currentState = {
        connectorName: this._collectionName,
        entityType: entityType,
        lastSyncTime: new Date(),
        checksums: {},
      };
    }

    currentState.cursor = cursor;
    currentState.lastETLRun = new Date();

    await this._syncStateService.saveState(currentState);
  }

  private async _getValidatedCursor(): Promise<ETLCursor | undefined> {
    const entityType = this._getEntityType();
    const syncState = await this._syncStateService.getState(this._collectionName, entityType);

    let cursor: ETLCursor | undefined;

    if (syncState?.cursor) {
      try {
        const rawCursor = syncState.cursor;
        cursor = { timestamp: new Date(rawCursor.timestamp), id: rawCursor.id };
      } catch (error) {
        this._logger.warn("Failed to parse sync state cursor", { error });
      }
    }

    const collectionInfo = await this._getCollectionVectorCount(entityType);
    if (collectionInfo.count === 0) {
      if (cursor) {
        this._logger.warn("Sync state exists but collection has no vectors. Resetting.");
        await this._syncStateService.clearState(this._collectionName, "etl");
      }
      return undefined;
    }

    return cursor;
  }

  private async _getCollectionVectorCount(
    entityType: string,
  ): Promise<{ count: number; latestTimestamp: string | null }> {
    try {
      const countResult = await this._qdrantClient.count(this._collectionName, {
        filter: {
          must: [{ key: "metadata.__type", match: { value: entityType } }],
        },
        exact: true,
      });

      if (countResult.count === 0) {
        return { count: 0, latestTimestamp: null };
      }

      const scrollResult = await this._qdrantClient.scroll(this._collectionName, {
        filter: {
          must: [{ key: "metadata.__type", match: { value: entityType } }],
        },
        limit: 1,
        with_payload: true,
        order_by: { key: "metadata.__indexed_at", direction: "desc" },
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
      this._logger.warn(`Failed to get collection vector count: ${error}`, { error });
      return { count: 0, latestTimestamp: null };
    }
  }

  protected _getEntityType(): EntityType | "unknown" {
    return "unknown";
  }

  protected async transform(data: T[]): Promise<BaseVectorPoint[]> {
    const allPoints: BaseVectorPoint[] = [];
    const concurrency = this._transformConcurrency;

    for (let index = 0; index < data.length; index += concurrency) {
      const chunk = data.slice(index, index + concurrency);
      const results = await Promise.all(
        chunk.map(async (item, itemIndex) => {
          try {
            let enrichment: EnrichmentResult | null = null;

            if (this._enableAIEnrichment && this._descriptor.enrich) {
              enrichment = await this._descriptor.enrich(item, {
                correlationId: `retove-${this._collectionName}-${(item as { id: string }).id}`,
              });
            }

            const enriched: EnrichedEntity<T> = { target: item, enrichment };

            return await this._transformSingleEntity(enriched, index + itemIndex);
          } catch (error) {
            this._logger.error(`Error processing item ${index + itemIndex}:`, { error });
            return null;
          }
        }),
      );

      const successfulPoints = results.filter((result): result is BaseVectorPoint => result !== null);
      allPoints.push(...successfulPoints);

      if (allPoints.length >= this._batchSize) {
        const batchToLoad = allPoints.splice(0, this._batchSize);
        await this.load(batchToLoad);
        const processed = Math.min(index + concurrency, data.length);
        this._logger.debug(
          `   └─ Upserting: ${batchToLoad.length} points (${processed}/${data.length} items processed)`,
        );
      }

      await new Promise((resolve) => setImmediate(resolve));
    }

    if (allPoints.length > 0) {
      await this.load(allPoints);
      this._logger.debug(`Loaded final batch of ${allPoints.length} points`);
    }

    return allPoints;
  }

  protected async _transformSingleEntity(enriched: EnrichedEntity<T>, index: number): Promise<BaseVectorPoint> {
    const text = this.getTextForEmbedding(enriched);
    const item = enriched.target;
    const entityId = String((item as { id: string }).id || `entity-${index}`);
    const correlationId = `retove-${this._collectionName}-${entityId}`;

    const vector = await this._embeddingsService.generateEmbeddings(text, { correlationId });

    if (vector.length !== this._vectorSize) {
      throw new Error(`Invalid vector size: ${vector.length}. Expected: ${this._vectorSize}`);
    }

    let sparseVector: SparseVector | undefined;
    if (this._enableHybridSearch) {
      sparseVector = this._sparseVectorService.generateSparseVector(text);
    }

    const payloadObj = this.getPayload(enriched);
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
          enrichment: enriched.enrichment,
          __source: "retove",
          __type: payloadObj.__type as EntityType,
          __collection: this._collectionName,
          __indexed_at: new Date().toISOString(),
        },
      },
      __type: this._getEntityType() as EntityType,
    };
  }

  protected _generateDeterministicId(collection: string, entityId: string): string {
    const input = `${collection}:${entityId}`;
    const hash = createHash("sha256").update(input).digest("hex");
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  protected async load(data: BaseVectorPoint[]): Promise<void> {
    await this._vectorLoader.load(data);
  }

  public async search(
    queryVector: number[],
    searchLimit: number,
    filter?: Record<string, unknown>,
  ): Promise<BaseVectorPoint[]> {
    return this._vectorSearcher.search(queryVector, searchLimit, filter);
  }

  public async searchByText(
    queryText: string,
    searchLimit: number,
    filter?: Record<string, unknown>,
  ): Promise<BaseVectorPoint[]> {
    return this._vectorSearcher.searchByText(queryText, searchLimit, filter);
  }

  protected async retry<T>(operation: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.retryOptions.maxRetries) {
        throw error;
      }
      const delay = Math.min(this.retryOptions.initialDelay * 2 ** attempt, this.retryOptions.maxDelay);
      this._logger.info(`Retry ${attempt + 1}/${this.retryOptions.maxRetries} after ${delay}ms`);
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
      let query = tx.select({ count: drizzleOrm.count() }).from(table).$dynamic();
      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(updatedAtField, cursor.timestamp),
            drizzleOrm.and(drizzleOrm.eq(updatedAtField, cursor.timestamp), drizzleOrm.gt(idField, cursor.id)),
          ),
        );
      }
      return query.execute();
    });
    const countVal = Number(result[0]?.count ?? 0);
    this._logger.debug(
      `[ETL Debug] Count query result: ${countVal} (Cursor: ${cursor ? JSON.stringify(cursor) : "None"})`,
    );
    return countVal;
  }

  protected _getTableConfig(): ETLTableConfig | null {
    return null;
  }

  protected abstract extract(limit: number, cursor?: ETLCursor): Promise<T[]>;
  protected abstract getTextForEmbedding(enriched: EnrichedEntity<T>): string;
  protected abstract getPayload(enriched: EnrichedEntity<T>): Record<string, unknown>;
  protected abstract getCursorFromItem(item: T): ETLCursor;
}
