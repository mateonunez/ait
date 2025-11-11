export interface TelemetryConfig {
  enabled?: boolean;
  publicKey?: string;
  secretKey?: string;
  baseURL?: string;
  flushAt?: number;
  flushInterval?: number;
}

export interface SpanMetadata {
  userId?: string;
  sessionId?: string;
  tags?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  // Error tracking
  errorCategory?: string;
  errorSeverity?: string;
  errorFingerprint?: string;
  isRetryable?: boolean;
  retryAttempt?: number;
  suggestedAction?: string;
  // Cost tracking
  generationTokens?: number;
  embeddingTokens?: number;
  estimatedCost?: number;
  // Version tracking
  version?: string;
  release?: string;
  environment?: string;
  deploymentTimestamp?: string;
  [key: string]: unknown;
}

export interface TraceContext {
  traceId: string;
  spanId?: string;
  parentSpanId?: string;
  metadata?: SpanMetadata;
}

export interface TelemetryOptions {
  enableTelemetry?: boolean;
  traceContext?: TraceContext;
  metadata?: SpanMetadata;
}

export type SpanType =
  | "generation"
  | "embedding"
  | "rag"
  | "tool"
  | "search"
  | "query_planning"
  | "reranking"
  | "conversation"
  | "context_preparation"
  | "pipeline"
  | "routing"
  | "retrieval"
  | "fusion";

export interface SpanInput {
  prompt?: string;
  messages?: unknown[];
  query?: string;
  text?: string;
  queries?: string[];
  documents?: unknown[];
  toolName?: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SpanOutput {
  text?: string;
  response?: string;
  vectors?: number[];
  documents?: unknown[];
  queries?: string[];
  result?: unknown;
  toolResult?: unknown;
  [key: string]: unknown;
}

export interface SpanEvent {
  name: string;
  type: SpanType;
  input?: SpanInput;
  output?: SpanOutput;
  metadata?: SpanMetadata;
  startTime?: number;
  endTime?: number;
  error?: Error | string;
  status?: "success" | "error" | "pending";
}
