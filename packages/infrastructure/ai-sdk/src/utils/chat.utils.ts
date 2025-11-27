import type { ChatMessage } from "../types/chat";

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
