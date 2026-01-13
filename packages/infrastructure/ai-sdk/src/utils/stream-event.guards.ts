import { STREAM_EVENT } from "../constants/stream.constants";
import type {
  CompletionDataEvent,
  ErrorEvent,
  MetadataChunkEvent,
  ReasoningChunkEvent,
  ReasoningEndEvent,
  StreamEvent,
  TextChunkEvent,
} from "../types/streaming/stream-events";

export function isTextChunk(event: StreamEvent): event is TextChunkEvent {
  return event.type === STREAM_EVENT.TEXT;
}

export function isMetadataChunk(event: StreamEvent): event is MetadataChunkEvent {
  return event.type === STREAM_EVENT.METADATA;
}

export function isCompletionData(event: StreamEvent): event is CompletionDataEvent {
  return event.type === STREAM_EVENT.DATA;
}

export function isErrorEvent(event: StreamEvent): event is ErrorEvent {
  return event.type === STREAM_EVENT.ERROR;
}

export function isReasoningEvent(event: StreamEvent): event is ReasoningChunkEvent | ReasoningEndEvent {
  return event.type === STREAM_EVENT.REASONING;
}
