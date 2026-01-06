import { requestStream } from "@ait/core";
import type { AggregatedMetadata, Conversation, ConversationWithMessages } from "@ait/core";
import { METADATA_TYPE, STREAM_EVENT } from "@ait/core";
import { getLogger } from "@ait/core";
import { apiConfig } from "../config/api.config";
import { parseGatewayStream } from "../utils/stream-parser.utils";

const logger = getLogger();

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SendMessageOptions {
  messages: ChatMessage[];
  model?: string;
  enableMetadata?: boolean;
  sessionId?: string;
  conversationId?: string;
  onText?: (text: string) => void;
  onMetadata?: (metadata: AggregatedMetadata) => void;
  onComplete?: (data: { finishReason: string; traceId: string; conversationId?: string }) => void;
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

async function processStreamEvents(
  response: Response,
  aggregatedMetadata: AggregatedMetadata,
  callbacks: Pick<SendMessageOptions, "onText" | "onMetadata" | "onComplete" | "onError">,
): Promise<void> {
  const { onText, onMetadata, onComplete, onError } = callbacks;

  for await (const event of parseGatewayStream(response)) {
    console.log("[ChatService] Stream event", { event });
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

  const result = await requestStream(`${apiConfig.apiBaseUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": "anonymous",
      "X-Session-Id": sessionId || `session-${Date.now()}`,
    },
    body: JSON.stringify({ messages, model, enableMetadata, conversationId: options.conversationId }),
    signal,
  });

  if (!result.ok) {
    const errorMessage = `${result.error.code}: ${result.error.message}`;
    logger.error("[ChatService] Error:", { error: errorMessage });
    onError?.(errorMessage);
    return;
  }

  try {
    const aggregatedMetadata = createEmptyMetadata();
    await processStreamEvents(result.value, aggregatedMetadata, { onText, onMetadata, onComplete, onError });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    logger.error("[ChatService] Error processing stream:", { error: errorMessage });
    onError?.(errorMessage);
  }
}

// Conversation management functions

export async function listConversations(): Promise<Conversation[]> {
  try {
    const response = await fetch(`${apiConfig.apiBaseUrl}/conversations`, {
      headers: {
        "X-User-Id": "anonymous",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch conversations");
    }

    return await response.json();
  } catch (error) {
    logger.error("[ChatService] Error fetching conversations:", { error });
    throw error;
  }
}

export async function getConversation(id: string): Promise<ConversationWithMessages> {
  try {
    const response = await fetch(`${apiConfig.apiBaseUrl}/conversations/${id}`, {
      headers: {
        "X-User-Id": "anonymous",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch conversation");
    }

    return await response.json();
  } catch (error) {
    logger.error("[ChatService] Error fetching conversation:", { error });
    throw error;
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const response = await fetch(`${apiConfig.apiBaseUrl}/conversations/${id}`, {
      method: "DELETE",
      headers: {
        "X-User-Id": "anonymous",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete conversation");
    }
  } catch (error) {
    logger.error("[ChatService] Error deleting conversation:", { error });
    throw error;
  }
}
