export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
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
