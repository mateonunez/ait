export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  createdAt?: Date;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  id: string;
  role: "assistant";
  content: string;
}

export interface StreamTextChunk {
  type: "text";
  content: string;
}

export function formatConversationHistory(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return "";
  }

  return messages
    .map((message) => {
      switch (message.role) {
        case "system":
          return `System: ${message.content}`;
        case "user":
          return `User: ${message.content}`;
        case "assistant":
          return `Assistant: ${message.content}`;
        default:
          return `${message.role}: ${message.content}`;
      }
    })
    .join("\n\n");
}
