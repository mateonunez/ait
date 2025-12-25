import type { MessageRole } from "@ait/core";

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
