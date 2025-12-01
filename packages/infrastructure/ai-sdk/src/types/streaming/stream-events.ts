import type { METADATA_TYPE, STREAM_EVENT, StreamEventType } from "../../constants/stream.constants";
import type { RAGContextMetadata } from "../metadata/rag-context.metadata";
import type { ReasoningStep } from "../metadata/reasoning-step.metadata";
import type { SuggestionItem } from "../metadata/suggestion.metadata";
import type { TaskStep } from "../metadata/task-step.metadata";
import type { ToolCallMetadata } from "../metadata/tool-call.metadata";
import type { ModelMetadata } from "../models/model.metadata";

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

export interface StreamMetadata {
  context?: RAGContextMetadata;
  reasoning: ReasoningStep[];
  tasks: TaskStep[];
  suggestions: SuggestionItem[];
  toolCalls: ToolCallMetadata[];
  model?: ModelMetadata;
}
