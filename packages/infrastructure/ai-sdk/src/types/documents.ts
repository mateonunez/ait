export interface BaseMetadata {
  id: string;
  __type: string;
  [key: string]: unknown;
}

export interface Document<TMetadata extends BaseMetadata = BaseMetadata> {
  pageContent: string;
  metadata: TMetadata;
}

export interface ScoredDocument<TMetadata extends BaseMetadata = BaseMetadata> {
  doc: Document<TMetadata>;
  score: number;
}
