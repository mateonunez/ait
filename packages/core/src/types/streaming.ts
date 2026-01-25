export const STREAM_EVENT = {
  TEXT: "0",
  METADATA: "m",
  DATA: "d",
  ERROR: "3",
  REASONING: "reasoning",
  TITLE_UPDATED: "title",
} as const;

export type StreamEventType = (typeof STREAM_EVENT)[keyof typeof STREAM_EVENT];
export type EventData = string | Record<string, unknown>;

export const METADATA_TYPE = {
  CONTEXT: "context",
  REASONING: "reasoning",
  TASK: "task",
  SUGGESTION: "suggestion",
  TOOL_CALL: "tool_call",
  MODEL: "model",
  ANALYSIS: "analysis",
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
  type: MetadataType;
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

export type SuggestionType = "question" | "action" | "tool" | "related";

export interface SuggestionAction {
  type: "prompt" | "tool_call" | "navigation";
  payload: string | Record<string, unknown>;
}

export interface SuggestionItem {
  id: string;
  text: string;
  type: SuggestionType;
  icon?: string;
  action?: SuggestionAction;
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

export interface AnalysisStep {
  id: string;
  type: MetadataType;
  content: string;
  confidence?: number;
  timestamp: number;
  order: number;
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

export interface TextChunkEvent extends BaseStreamEvent<EventData> {
  type: typeof STREAM_EVENT.TEXT;
  data: EventData;
}

export type MetadataPayload =
  | { type: typeof METADATA_TYPE.CONTEXT; data: RAGContextMetadata }
  | { type: typeof METADATA_TYPE.REASONING; data: ReasoningStep }
  | { type: typeof METADATA_TYPE.TASK; data: TaskStep }
  | { type: typeof METADATA_TYPE.SUGGESTION; data: SuggestionItem[] }
  | { type: typeof METADATA_TYPE.TOOL_CALL; data: ToolCallMetadata }
  | { type: typeof METADATA_TYPE.MODEL; data: ModelMetadata }
  | { type: typeof METADATA_TYPE.ANALYSIS; data: AnalysisStep };

export interface MetadataChunkEvent extends BaseStreamEvent<EventData> {
  type: typeof STREAM_EVENT.METADATA;
  data: EventData;
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

export interface ErrorEvent extends BaseStreamEvent<EventData> {
  type: typeof STREAM_EVENT.ERROR;
  data: EventData;
}

export interface ReasoningEvent extends BaseStreamEvent<EventData> {
  type: typeof STREAM_EVENT.REASONING;
  data: EventData;
}

export type StreamEvent = TextChunkEvent | MetadataChunkEvent | CompletionDataEvent | ErrorEvent | ReasoningEvent;

export interface AggregatedMetadata {
  context?: RAGContextMetadata;
  reasoning: ReasoningStep[];
  tasks: TaskStep[];
  suggestions: SuggestionItem[];
  toolCalls: ToolCallMetadata[];
  model?: ModelMetadata;
  usage?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
}

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessageWithMetadata {
  id: string;
  role: MessageRole;
  content: string;
  metadata?: AggregatedMetadata;
  traceId?: string;
  createdAt: Date;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  ragContextTokens: number;
  totalTokens: number;
}
