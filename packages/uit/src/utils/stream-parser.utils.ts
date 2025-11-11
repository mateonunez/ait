import {
  STREAM_EVENT,
  METADATA_TYPE,
  type StreamEvent,
  type MetadataPayload,
  type AggregatedMetadata,
} from "../types/streaming.types";

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
        return {
          type: STREAM_EVENT.TEXT,
          data: JSON.parse(payload),
        };
      }

      case STREAM_EVENT.METADATA: {
        return {
          type: STREAM_EVENT.METADATA,
          data: JSON.parse(payload),
        };
      }

      case STREAM_EVENT.DATA: {
        return {
          type: STREAM_EVENT.DATA,
          data: JSON.parse(payload),
        };
      }

      case STREAM_EVENT.ERROR: {
        return {
          type: STREAM_EVENT.ERROR,
          data: JSON.parse(payload),
        };
      }

      default:
        console.warn(`[StreamParser] Unknown event type: ${eventType}`);
        return null;
    }
  } catch (error) {
    console.error(`[StreamParser] Failed to parse line: ${line}`, error);
    return null;
  }
}

export function aggregateMetadata(metadata: AggregatedMetadata, payload: MetadataPayload): AggregatedMetadata {
  switch (payload.type) {
    case METADATA_TYPE.CONTEXT: {
      const existingDocs = metadata.context?.documents || [];
      const newDocs = payload.data.documents || [];

      const docMap = new Map();
      for (const doc of [...existingDocs, ...newDocs]) {
        docMap.set(doc.id, doc);
      }

      return {
        ...metadata,
        context: {
          ...payload.data,
          documents: Array.from(docMap.values()),
        },
      };
    }

    case METADATA_TYPE.REASONING:
      return { ...metadata, reasoning: [...metadata.reasoning, payload.data] };

    case METADATA_TYPE.TASK: {
      const existingTaskIndex = metadata.tasks.findIndex((t) => t.id === payload.data.id);
      if (existingTaskIndex >= 0) {
        const updatedTasks = [...metadata.tasks];
        updatedTasks[existingTaskIndex] = payload.data;
        return { ...metadata, tasks: updatedTasks };
      }
      return { ...metadata, tasks: [...metadata.tasks, payload.data] };
    }

    case METADATA_TYPE.SUGGESTION:
      return { ...metadata, suggestions: payload.data };

    case METADATA_TYPE.TOOL_CALL: {
      const existingToolIndex = metadata.toolCalls.findIndex((t) => t.id === payload.data.id);
      if (existingToolIndex >= 0) {
        const updatedTools = [...metadata.toolCalls];
        updatedTools[existingToolIndex] = payload.data;
        return { ...metadata, toolCalls: updatedTools };
      }
      return { ...metadata, toolCalls: [...metadata.toolCalls, payload.data] };
    }

    case METADATA_TYPE.MODEL:
      return { ...metadata, model: payload.data };

    default:
      return metadata;
  }
}

export function createEmptyMetadata(): AggregatedMetadata {
  return {
    reasoning: [],
    tasks: [],
    suggestions: [],
    toolCalls: [],
  };
}

export async function* parseGatewayStream(response: Response): AsyncGenerator<any> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get readable stream from response.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      // biome-ignore lint/suspicious/noAssignInExpressions: it's safe to assign to newlineIndex
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.substring(0, newlineIndex).trim();
        buffer = buffer.substring(newlineIndex + 1);

        if (line.length > 0) {
          const separatorIndex = line.indexOf(":");
          if (separatorIndex === -1) {
            console.warn("Malformed stream line (no separator):", line);
            continue;
          }

          const type = line.substring(0, separatorIndex);
          const dataString = line.substring(separatorIndex + 1);

          try {
            const data = JSON.parse(dataString);
            switch (type) {
              case STREAM_EVENT.TEXT:
                yield { type: STREAM_EVENT.TEXT, content: data };
                break;
              case STREAM_EVENT.METADATA:
                yield { type: STREAM_EVENT.METADATA, metadataType: data.type, data: data.data };
                break;
              case STREAM_EVENT.DATA:
                yield { type: STREAM_EVENT.DATA, ...data };
                break;
              case STREAM_EVENT.ERROR:
                yield { type: STREAM_EVENT.ERROR, message: data };
                break;
              default:
                console.warn(`Unknown stream event type received: ${type}`);
            }
          } catch (e) {
            console.error("Failed to parse stream data JSON:", e, "Data string:", dataString);
          }
        }
      }
    }
    if (buffer.length > 0) {
      const separatorIndex = buffer.indexOf(":");
      if (separatorIndex !== -1) {
        const type = buffer.substring(0, separatorIndex);
        const dataString = buffer.substring(separatorIndex + 1);
        try {
          const data = JSON.parse(dataString);
          switch (type) {
            case STREAM_EVENT.TEXT:
              yield { type: STREAM_EVENT.TEXT, content: data };
              break;
            case STREAM_EVENT.METADATA:
              yield { type: STREAM_EVENT.METADATA, metadataType: data.type, data: data.data };
              break;
            case STREAM_EVENT.DATA:
              yield { type: STREAM_EVENT.DATA, ...data };
              break;
            case STREAM_EVENT.ERROR:
              yield { type: STREAM_EVENT.ERROR, message: data };
              break;
          }
        } catch (e) {
          console.error("Failed to parse remaining buffer:", e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
