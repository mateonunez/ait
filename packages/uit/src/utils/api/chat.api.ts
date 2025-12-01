import { requestStream } from "@ait/core";
import type { AggregatedMetadata } from "@ait/core";
import { METADATA_TYPE, STREAM_EVENT } from "@ait/core";
import { getLogger } from "@ait/core";
import { parseGatewayStream } from "../stream-parser.utils";

const logger = getLogger();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:3000/api";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SendMessageOptions {
  messages: ChatMessage[];
  model?: string;
  enableMetadata?: boolean;
  sessionId?: string;
  onText?: (text: string) => void;
  onMetadata?: (metadata: AggregatedMetadata) => void;
  onComplete?: (data: { finishReason: string; traceId: string }) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

function createEmptyMetadata(): AggregatedMetadata {
  return {
    context: undefined,
    reasoning: [],
    tasks: [],
    suggestions: [],
    toolCalls: [],
    model: undefined,
  };
}

function updateMetadata(metadata: AggregatedMetadata, event: any): void {
  switch (event.metadataType) {
    case METADATA_TYPE.CONTEXT:
      metadata.context = event.data;
      break;

    case METADATA_TYPE.REASONING:
      metadata.reasoning = [...metadata.reasoning, event.data];
      break;

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

async function processStreamEvents(
  response: Response,
  aggregatedMetadata: AggregatedMetadata,
  callbacks: Pick<SendMessageOptions, "onText" | "onMetadata" | "onComplete" | "onError">,
): Promise<void> {
  const { onText, onMetadata, onComplete, onError } = callbacks;

  for await (const event of parseGatewayStream(response)) {
    switch (event.type) {
      case STREAM_EVENT.TEXT:
        onText?.(event.content);
        break;

      case STREAM_EVENT.METADATA:
        updateMetadata(aggregatedMetadata, event);
        onMetadata?.(aggregatedMetadata);
        break;

      case STREAM_EVENT.DATA:
        onComplete?.({
          finishReason: event.finishReason || "stop",
          traceId: event.traceId || "",
        });
        break;

      case STREAM_EVENT.ERROR:
        onError?.(event.message);
        break;
    }
  }
}

export async function sendMessage(options: SendMessageOptions): Promise<void> {
  const {
    messages,
    model,
    enableMetadata = true,
    sessionId,
    onText,
    onMetadata,
    onComplete,
    onError,
    signal,
  } = options;

  const result = await requestStream(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": "anonymous",
      "X-Session-Id": sessionId || `session-${Date.now()}`,
    },
    body: JSON.stringify({ messages, model, enableMetadata }),
    signal,
  });

  if (!result.ok) {
    const errorMessage = `${result.error.code}: ${result.error.message}`;
    logger.error("[ChatAPI] Error:", { error: errorMessage });
    onError?.(errorMessage);
    return;
  }

  try {
    const aggregatedMetadata = createEmptyMetadata();
    await processStreamEvents(result.value, aggregatedMetadata, { onText, onMetadata, onComplete, onError });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    logger.error("[ChatAPI] Error processing stream:", { error: errorMessage });
    onError?.(errorMessage);
  }
}
