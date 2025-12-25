import type { MessageRole } from "./streaming";

export interface Conversation {
  id: string;
  title: string | null;
  userId: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, any> | null;
  traceId: string | null;
  createdAt: Date;
}

export interface ConversationWithMessages {
  conversation: Conversation;
  messages: Message[];
}
