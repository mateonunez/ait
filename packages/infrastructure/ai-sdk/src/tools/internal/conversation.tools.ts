import type { MessageRole } from "@ait/core";
import { getConversationService } from "@ait/store";
import { z } from "zod";

export function createConversationTools() {
  const conversationService = getConversationService();

  return {
    chat_list_my_conversations: {
      description: "List all conversations in the chat history. Use this to see past conversations and their metadata.",
      parameters: z.object({
        userId: z.string().optional().describe("Optional user ID to filter conversations"),
      }),
      execute: async ({ userId }: { userId?: string }) => {
        const conversations = await conversationService.listConversations(userId);

        return {
          conversations: conversations.map((conversation: any) => ({
            id: conversation.id,
            title: conversation.title || "Untitled",
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            metadata: conversation.metadata,
          })),
          count: conversations.length,
        };
      },
    },

    chat_get_my_conversation: {
      description:
        "Get a specific conversation with all its messages. Use this to review the full context of a past conversation.",
      parameters: z.object({
        conversationId: z.string().describe("The ID of the conversation to retrieve"),
      }),
      execute: async ({ conversationId }: { conversationId: string }) => {
        const result = await conversationService.getConversationWithMessages(conversationId);

        if (!result) {
          return {
            error: "Conversation not found",
            conversationId,
          };
        }

        return {
          conversation: {
            id: result.conversation.id,
            title: result.conversation.title || "Untitled",
            createdAt: result.conversation.createdAt,
            updatedAt: result.conversation.updatedAt,
            metadata: result.conversation.metadata,
          },
          messages: result.messages.map((message: any) => ({
            id: message.id,
            conversationId: message.conversationId,
            role: message.role as MessageRole,
            content: message.content,
            createdAt: message.createdAt,
            metadata: message.metadata as Record<string, any> | null,
            traceId: message.traceId,
          })),
          messageCount: result.messages.length,
        };
      },
    },
  };
}
