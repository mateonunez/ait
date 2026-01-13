import { SPARSE_VECTOR_NAME, getCollectionsNames } from "@ait/ai-sdk";
import { getLogger } from "@ait/core";
import type { qdrant } from "@ait/qdrant";
import { CORE_PAYLOAD_INDEXES, type PayloadIndex } from "../retove.etl.types";

export class ETLCollectionManager {
  private readonly _logger = getLogger();

  constructor(
    private readonly _qdrantClient: qdrant.QdrantClient,
    private readonly _collectionName: string,
    private readonly _vectorSize: number,
    private readonly _retryFn: <T>(operation: () => Promise<T>) => Promise<T>,
  ) {
    this._validateCollectionName(_collectionName);
  }

  private _validateCollectionName(collectionName: string): void {
    const validCollections = getCollectionsNames();
    if (!validCollections.includes(collectionName)) {
      throw new Error(`Invalid collection name: ${collectionName}. Must be one of: ${validCollections.join(", ")}`);
    }
  }

  async ensureCollectionExists(): Promise<void> {
    const response = await this._retryFn(() => this._qdrantClient.getCollections());
    const collectionExists = response.collections.some((collection) => collection.name === this._collectionName);

    if (collectionExists) {
      this._logger.debug(`Collection ${this._collectionName} already exists`);
      return;
    }

    this._logger.info(`Creating collection: ${this._collectionName}`);
    await this._retryFn(() =>
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
          [SPARSE_VECTOR_NAME]: {
            index: {
              on_disk: true,
              full_scan_threshold: 5000,
            },
          },
        },
      }),
    );
  }

  async createPayloadIndexes(collectionSpecificIndexes: PayloadIndex[] = []): Promise<void> {
    const allIndexes = [...CORE_PAYLOAD_INDEXES, ...collectionSpecificIndexes];

    for (const index of allIndexes) {
      try {
        await this._retryFn(() =>
          this._qdrantClient.createPayloadIndex(this._collectionName, {
            field_name: index.field_name,
            field_schema: index.field_schema,
          }),
        );
        this._logger.debug(`Created index: ${index.field_name} (${index.field_schema})`);
      } catch (error) {
        // Index may already exist - this is expected
        this._logger.debug(`Index ${index.field_name} may already exist: ${error}`, { error });
      }
    }
  }
}
