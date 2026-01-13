import { SPARSE_VECTOR_NAME } from "@ait/ai-sdk";
import { getLogger } from "@ait/core";
import type { qdrant } from "@ait/qdrant";
import type { BaseVectorPoint } from "../retove.etl.types";

export class ETLVectorLoader {
  private readonly _logger = getLogger();

  constructor(
    private readonly _qdrantClient: qdrant.QdrantClient,
    private readonly _collectionName: string,
    private readonly _batchSize: number,
    private readonly _batchUpsertConcurrency: number,
    private readonly _retryFn: <T>(operation: () => Promise<T>) => Promise<T>,
  ) {}

  async load(data: BaseVectorPoint[]): Promise<void> {
    if (data.length === 0) return;

    const tasks: Array<() => Promise<void>> = [];

    for (let i = 0; i < data.length; i += this._batchSize) {
      const batch = data.slice(i, i + this._batchSize);
      tasks.push(async () => {
        const upsertPoints = batch.map((point) => this._preparePointForUpsert(point));

        await this._retryFn(async () => {
          this._logger.debug(`Upserting batch of ${batch.length} points`);
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

  private _preparePointForUpsert(point: BaseVectorPoint): {
    id: string;
    vector: number[] | Record<string, number[] | { indices: number[]; values: number[] }>;
    payload: Record<string, unknown>;
  } {
    const basePoint: {
      id: string;
      vector: number[] | Record<string, number[] | { indices: number[]; values: number[] }>;
      payload: Record<string, unknown>;
    } = {
      id: point.id,
      vector: point.vector,
      payload: point.payload,
    };

    if (point.sparseVector && point.sparseVector.indices.length > 0) {
      basePoint.vector = {
        "": point.vector,
        [SPARSE_VECTOR_NAME]: {
          indices: point.sparseVector.indices,
          values: point.sparseVector.values,
        },
      };
    }

    return basePoint;
  }
}
