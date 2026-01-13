import type { SparseVector } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";

export interface BaseVectorPoint {
  id: string;
  vector: number[];
  sparseVector?: SparseVector;
  payload: Record<string, unknown>;
  __type: EntityType;
}

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
};

export interface PayloadIndex {
  field_name: string;
  field_schema: "keyword" | "datetime" | "integer" | "float" | "bool" | "text";
}

export const CORE_PAYLOAD_INDEXES: PayloadIndex[] = [
  { field_name: "metadata.__type", field_schema: "keyword" },
  { field_name: "metadata.id", field_schema: "keyword" },
  { field_name: "metadata.__indexed_at", field_schema: "datetime" },
];
