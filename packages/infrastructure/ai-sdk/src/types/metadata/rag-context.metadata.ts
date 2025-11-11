export interface RetrievedDocument {
  id: string;
  content: string;
  score: number;
  source: DocumentSource;
  timestamp?: number;
  entityTypes?: string[];
}

export interface DocumentSource {
  type: string;
  identifier?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface RAGContextMetadata {
  documents: RetrievedDocument[];
  query: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
  timestamp: number;
  usedTemporalCorrelation?: boolean;
  contextLength: number;
  retrievalTimeMs?: number;
}
