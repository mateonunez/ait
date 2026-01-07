import { createEmptyMetadata, processStreamEvents } from "@/utils/chat-stream.utils";
import { requestStream } from "@ait/core";
import type { AggregatedMetadata, Conversation, ConversationWithMessages } from "@ait/core";
import { getLogger } from "@ait/core";
import { apiConfig } from "../config/api.config";

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
