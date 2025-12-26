import { getConversationService } from "@ait/store";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

interface GetConversationParams {
  id: string;
}

interface UpdateConversationBody {
  title?: string;
  metadata?: Record<string, any>;
}

export default async function conversationsRoutes(fastify: FastifyInstance) {
  const conversationService = getConversationService();

  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.headers["x-user-id"] as string | undefined;
      const conversations = await conversationService.listConversations(userId);

      reply.send(conversations);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/conversations" }, "Failed to list conversations");
      reply.status(500).send({ error: "Failed to list conversations" });
    }
  });

  fastify.get<{ Params: GetConversationParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const conversation = await conversationService.getConversationWithMessages(id);

      if (!conversation) {
        return reply.status(404).send({ error: "Conversation not found" });
      }

      reply.send(conversation);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/conversations/:id" }, "Failed to get conversation");
      reply.status(500).send({ error: "Failed to get conversation" });
    }
  });

  fastify.patch<{ Params: GetConversationParams; Body: UpdateConversationBody }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;

      const updated = await conversationService.updateConversation(id, updates);

      if (!updated) {
        return reply.status(404).send({ error: "Conversation not found" });
      }

      reply.send(updated);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "PATCH /conversations/:id" }, "Failed to update conversation");
      reply.status(500).send({ error: "Failed to update conversation" });
    }
  });

  fastify.delete<{ Params: GetConversationParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const result = await conversationService.deleteConversation(id);

      reply.send({ deleted: result });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "DELETE /conversations/:id" }, "Failed to delete conversation");
      reply.status(500).send({ error: "Failed to delete conversation" });
    }
  });
}
