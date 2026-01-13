import type { ChatMessage } from "@ait/ai-sdk";

export interface ChatRequestBody {
  messages: ChatMessage[];
  model?: string;
  enableMetadata?: boolean;
  conversationId?: string;
}

export interface ChatValidation {
  isValid: boolean;
  error?: string;
  prompt?: string;
  conversationHistory?: ChatMessage[];
}

export function validateChatRequest(body: ChatRequestBody): ChatValidation {
  const { messages } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { isValid: false, error: "Messages array is required" };
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    return { isValid: false, error: "Last message must be from user" };
  }

  return {
    isValid: true,
    prompt: lastMessage.content,
    conversationHistory: messages.slice(0, -1),
  };
}
