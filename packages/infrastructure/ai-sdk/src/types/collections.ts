import type { EntityType } from "@ait/core";
import type { CollectionVendor } from "../config/collections.config";
import type { BaseMetadata, Document } from "./documents";

export interface CollectionWeight {
  vendor: CollectionVendor;
  weight: number;
  reasoning?: string;
}

export interface MultiCollectionQuery {
  query: string;
  collections: CollectionWeight[];
  maxDocumentsPerCollection: number;
  totalMaxDocuments: number;
}

export interface CollectionRouterResult {
  selectedCollections: CollectionWeight[];
  reasoning: string;
  strategy: "single-collection" | "multi-collection" | "all-collections" | "no-retrieval";
  confidence: number;
  suggestedEntityTypes?: EntityType[];
}

export interface WeightedDocument<TMetadata extends BaseMetadata = BaseMetadata> extends Document<TMetadata> {
  collectionVendor: CollectionVendor;
  collectionWeight: number;
  finalScore: number;
}

export interface CollectionSearchResult<TMetadata extends BaseMetadata = BaseMetadata> {
  vendor: CollectionVendor;
  documents: Document<TMetadata>[];
  searchDuration: number;
  totalResults: number;
}

export interface MultiCollectionSearchResult<TMetadata extends BaseMetadata = BaseMetadata> {
  results: CollectionSearchResult<TMetadata>[];
  totalDocuments: number;
  totalDuration: number;
  queriesExecuted: number;
}
