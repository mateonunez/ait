export const STREAM_EVENT = {
  TEXT: "0",
  METADATA: "m",
  DATA: "d",
  ERROR: "3",
} as const;

export type StreamEventType = (typeof STREAM_EVENT)[keyof typeof STREAM_EVENT];

export const METADATA_TYPE = {
  CONTEXT: "context",
  REASONING: "reasoning",
  TASK: "task",
  SUGGESTION: "suggestion",
  TOOL_CALL: "tool_call",
  MODEL: "model",
} as const;

export type MetadataType = (typeof METADATA_TYPE)[keyof typeof METADATA_TYPE];

export const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export interface RetrievedDocument {
  id: string;
  content: string;
  score: number;
  source: {
    type: string;
    identifier?: string;
    url?: string;
    metadata?: Record<string, unknown>;
  };
  timestamp?: number;
  entityTypes?: string[];
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

export interface ReasoningStep {
  id: string;
  type: "analysis" | "planning" | "execution" | "reflection";
  content: string;
  confidence?: number;
  timestamp: number;
  order: number;
}

export interface TaskStep {
  id: string;
  description: string;
  status: TaskStatus;
  result?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  order: number;
  progress?: number;
}

export interface SuggestionItem {
  id: string;
  text: string;
  type: "question" | "action" | "tool" | "related";
  icon?: string;
  action?: {
    type: "prompt" | "tool_call" | "navigation";
    payload: string | Record<string, unknown>;
  };
  score?: number;
}

export interface ToolCallMetadata {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: "pending" | "executing" | "completed" | "failed";
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}

export interface ModelCapabilities {
  supportsChainOfThought: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsJsonMode: boolean;
}

export interface ModelMetadata {
  id: string;
  name: string;
  provider: string;
  capabilities: ModelCapabilities;
  contextWindow: number;
  maxOutputTokens?: number;
}

export interface ModelPreferences {
  showReasoning?: boolean;
  enableTasks?: boolean;
  showContext?: boolean;
  enableSuggestions?: boolean;
}

export interface BaseStreamEvent<T = unknown> {
  type: StreamEventType;
  data?: T;
}

export interface TextChunkEvent extends BaseStreamEvent<string> {
  type: typeof STREAM_EVENT.TEXT;
  data: string;
}

export type MetadataPayload =
  | { type: typeof METADATA_TYPE.CONTEXT; data: RAGContextMetadata }
  | { type: typeof METADATA_TYPE.REASONING; data: ReasoningStep }
  | { type: typeof METADATA_TYPE.TASK; data: TaskStep }
  | { type: typeof METADATA_TYPE.SUGGESTION; data: SuggestionItem[] }
  | { type: typeof METADATA_TYPE.TOOL_CALL; data: ToolCallMetadata }
  | { type: typeof METADATA_TYPE.MODEL; data: ModelMetadata };

export interface MetadataChunkEvent extends BaseStreamEvent<MetadataPayload> {
  type: typeof STREAM_EVENT.METADATA;
  data: MetadataPayload;
}

export interface CompletionDataEvent extends BaseStreamEvent {
  type: typeof STREAM_EVENT.DATA;
  data: {
    finishReason: "stop" | "length" | "tool_calls" | "error";
    traceId?: string;
    metadata?: {
      totalTokens?: number;
      duration?: number;
      model?: string;
    };
  };
}

export interface ErrorEvent extends BaseStreamEvent<string> {
  type: typeof STREAM_EVENT.ERROR;
  data: string;
}

export type StreamEvent = TextChunkEvent | MetadataChunkEvent | CompletionDataEvent | ErrorEvent;

export interface AggregatedMetadata {
  context?: RAGContextMetadata;
  reasoning: ReasoningStep[];
  tasks: TaskStep[];
  suggestions: SuggestionItem[];
  toolCalls: ToolCallMetadata[];
  model?: ModelMetadata;
}

export interface ChatMessageWithMetadata {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: AggregatedMetadata;
  traceId?: string;
  createdAt: Date;
}
