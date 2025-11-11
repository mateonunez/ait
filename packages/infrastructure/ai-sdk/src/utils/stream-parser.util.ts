import {
  STREAM_EVENT,
  type StreamEvent,
  type TextChunkEvent,
  type MetadataChunkEvent,
  type CompletionDataEvent,
  type ErrorEvent,
} from "../types";

/**
 * Parse a single line from the stream into a StreamEvent
 *
 * @param line - Raw line from the stream (e.g., "0:text content" or "m:{"type":"context",...}")
 * @returns Parsed StreamEvent or null if parsing fails
 */
export function parseStreamLine(line: string): StreamEvent | null {
  if (!line || !line.includes(":")) {
    return null;
  }

  const colonIndex = line.indexOf(":");
  const eventType = line.slice(0, colonIndex);
  const payload = line.slice(colonIndex + 1);

  try {
    switch (eventType) {
      case STREAM_EVENT.TEXT: {
        const textEvent: TextChunkEvent = {
          type: STREAM_EVENT.TEXT,
          data: JSON.parse(payload) as string,
        };
        return textEvent;
      }

      case STREAM_EVENT.METADATA: {
        const metadataEvent: MetadataChunkEvent = {
          type: STREAM_EVENT.METADATA,
          data: JSON.parse(payload),
        };
        return metadataEvent;
      }

      case STREAM_EVENT.DATA: {
        const dataEvent: CompletionDataEvent = {
          type: STREAM_EVENT.DATA,
          data: JSON.parse(payload),
        };
        return dataEvent;
      }

      case STREAM_EVENT.ERROR: {
        const errorEvent: ErrorEvent = {
          type: STREAM_EVENT.ERROR,
          data: JSON.parse(payload) as string,
        };
        return errorEvent;
      }

      default:
        console.warn(`[StreamParser] Unknown event type: ${eventType}`);
        return null;
    }
  } catch (error) {
    console.error(`[StreamParser] Failed to parse stream line: ${line}`, error);
    return null;
  }
}

/**
 * Type guards for stream events
 */
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
