import { type SuggestionContext, getSuggestionService } from "@ait/ai-sdk";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const suggestionService = getSuggestionService();

export default async function suggestionsRoutes(fastify: FastifyInstance) {
  fastify.post("/", async (request: FastifyRequest<{ Body: SuggestionContext }>, reply: FastifyReply) => {
    try {
      const { context, history, recentMessages } = request.body;

      const suggestions = await suggestionService.generateSuggestions({
        context,
        history,
        recentMessages,
      });

      return reply.send(suggestions);
    } catch (error) {
      request.log.error(error, "Failed to generate suggestions");
      return reply.status(500).send({ error: "Failed to generate suggestions" });
    }
  });
}
