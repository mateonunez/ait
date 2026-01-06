import type { STREAM_EVENT, StreamEventType } from "../../constants/stream.constants";
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

export interface TextChunkEvent extends BaseStreamEvent<EventData> {
  type: typeof STREAM_EVENT.TEXT;
  data: EventData;
}

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

export type EventData = string | Record<string, unknown>;

export interface ErrorEvent extends BaseStreamEvent<EventData> {
  type: typeof STREAM_EVENT.ERROR;
  data: EventData;
}

export interface ReasoningEndEvent extends BaseStreamEvent<EventData> {
  type: typeof STREAM_EVENT.REASONING;
  data: EventData;
}

export interface ReasoningChunkEvent extends BaseStreamEvent<EventData> {
  type: typeof STREAM_EVENT.REASONING;
  data: EventData;
}

export type StreamEvent =
  | TextChunkEvent
  | MetadataChunkEvent
  | CompletionDataEvent
  | ErrorEvent
  | ReasoningChunkEvent
  | ReasoningEndEvent;

export interface StreamMetadata {
  context?: RAGContextMetadata;
  reasoning: ReasoningStep[];
  tasks: TaskStep[];
  suggestions: SuggestionItem[];
  toolCalls: ToolCallMetadata[];
  model?: ModelMetadata;
}
