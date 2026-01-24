import type { AggregatedMetadata } from "@ait/core";
import { METADATA_TYPE, STREAM_EVENT } from "@ait/core";
import { parseGatewayStream } from "./stream-parser.utils";

export interface ChatServiceCallbacks {
  onText?: (text: string) => void;
  onMetadata?: (metadata: AggregatedMetadata) => void;
  onComplete?: (data: { finishReason: string; traceId: string; conversationId?: string; title?: string }) => void;
  onTitleUpdate?: (title: string) => void;
  onError?: (error: string) => void;
}

export function createEmptyMetadata(): AggregatedMetadata {
  return {
    context: undefined,
    reasoning: [],
    tasks: [],
    suggestions: [],
    toolCalls: [],
    model: undefined,
  };
}

export function updateMetadata(metadata: AggregatedMetadata, event: any): void {
  switch (event.metadataType) {
    case METADATA_TYPE.CONTEXT:
      metadata.context = event.data;
      break;
    case METADATA_TYPE.REASONING: {
      const existingStepIndex = metadata.reasoning.findIndex((r: any) => r.id === event.data.id);
      if (existingStepIndex >= 0) {
        const updatedReasoning = [...metadata.reasoning];
        updatedReasoning[existingStepIndex] = {
          ...updatedReasoning[existingStepIndex],
          content: updatedReasoning[existingStepIndex].content + event.data.content,
        };
        metadata.reasoning = updatedReasoning;
      } else {
        metadata.reasoning = [...metadata.reasoning, event.data];
      }
      break;
    }
    case METADATA_TYPE.TASK: {
      const taskIndex = metadata.tasks.findIndex((t: any) => t.id === event.data.id);
      if (taskIndex >= 0) {
        metadata.tasks[taskIndex] = event.data;
      } else {
        metadata.tasks = [...metadata.tasks, event.data];
      }
      break;
    }
    case METADATA_TYPE.SUGGESTION:
      metadata.suggestions = event.data;
      break;
    case METADATA_TYPE.TOOL_CALL: {
      const toolIndex = metadata.toolCalls.findIndex((t: any) => t.id === event.data.id);
      if (toolIndex >= 0) {
        metadata.toolCalls[toolIndex] = event.data;
      } else {
        metadata.toolCalls = [...metadata.toolCalls, event.data];
      }
      break;
    }
    case METADATA_TYPE.MODEL:
      metadata.model = event.data;
      break;
  }
}

export async function processStreamEvents(
  response: Response,
  aggregatedMetadata: AggregatedMetadata,
  callbacks: ChatServiceCallbacks,
): Promise<void> {
  const { onText, onMetadata, onComplete, onError } = callbacks;

  for await (const event of parseGatewayStream(response)) {
    switch (event.type) {
      case STREAM_EVENT.TEXT:
        onText?.(event.content);
        break;
      case STREAM_EVENT.METADATA:
        updateMetadata(aggregatedMetadata, event);
        onMetadata?.({ ...aggregatedMetadata });
        break;
      case STREAM_EVENT.DATA:
        onComplete?.({
          finishReason: event.finishReason || "stop",
          traceId: event.traceId || "",
          conversationId: event.conversationId,
        });
        break;
      case STREAM_EVENT.TITLE_UPDATED:
        callbacks.onTitleUpdate?.(event.title);
        break;
      case STREAM_EVENT.ERROR:
        onError?.(event.message);
        break;
    }
  }
}
