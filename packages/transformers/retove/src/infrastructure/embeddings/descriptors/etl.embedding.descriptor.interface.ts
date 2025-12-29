export interface EnrichmentResult {
  summary: string;
  sentiment?: string;
  entities?: string[];
  intent?: string;
  technicalDetails?: string;
  ocr?: string;
  objects?: string[];
  style?: string;
  mood?: string;
}

export interface EnrichedEntity<T> {
  target: T;
  enrichment?: EnrichmentResult | null;
}

export interface IETLEmbeddingDescriptor<T> {
  getEmbeddingText(enriched: EnrichedEntity<T>): string;
  getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<T>): U;
  enrich?(entity: T, options?: any): Promise<EnrichmentResult | null>;
}
