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
