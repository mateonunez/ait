import {
  createAllConnectorTools,
  GenerationModels,
  getTextGenerationService,
  initAItClient,
  type TextGenerationService,
} from "@ait/ai-sdk";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ChatMessage } from "@ait/ai-sdk";
import { connectorServiceFactory, type ConnectorSpotifyService } from "@ait/connectors";

declare module "fastify" {
  interface FastifyInstance {
    textGenerationService: TextGenerationService;
    spotifyService: ConnectorSpotifyService;
  }
}

interface ChatRequestBody {
  messages: ChatMessage[];
}

initAItClient({
  generation: {
    model: GenerationModels.GPT_OSS_20B_CLOUD,
    temperature: 1,
  },
});

export default async function chatRoutes(fastify: FastifyInstance) {
  if (!fastify.textGenerationService) {
    fastify.decorate("textGenerationService", getTextGenerationService());
  }

  if (!fastify.spotifyService) {
    fastify.decorate("spotifyService", connectorServiceFactory.getService<ConnectorSpotifyService>("spotify"));
  }

  const textGenerationService = fastify.textGenerationService;

  const tools = createAllConnectorTools(fastify.spotifyService);

  fastify.post("/", async (request: FastifyRequest<{ Body: ChatRequestBody }>, reply: FastifyReply) => {
    try {
      const { messages } = request.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return reply.status(400).send({ error: "Messages array is required" });
      }

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== "user") {
        return reply.status(400).send({ error: "Last message must be from user" });
      }

      const prompt = lastMessage.content;
      const conversationHistory = messages.slice(0, -1);

      reply.raw.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");

      reply.raw.setHeader("Content-Type", "text/plain; charset=utf-8");
      reply.raw.setHeader("Transfer-Encoding", "chunked");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("X-Vercel-AI-Data-Stream", "v1");

      reply.hijack();

      try {
        const stream = textGenerationService.generateStream({
          prompt,
          enableRAG: true,
          messages: conversationHistory,
          tools,
          maxToolRounds: 2,
        });

        for await (const chunk of stream) {
          reply.raw.write(`0:${JSON.stringify(chunk)}\n`);
        }

        reply.raw.write(`d:${JSON.stringify({ finishReason: "stop" })}\n`);
      } catch (streamError: any) {
        fastify.log.error({ err: streamError, route: "/chat" }, "Stream error occurred.");
        reply.raw.write(`3:${JSON.stringify(streamError.message || "Stream generation failed")}\n`);
      } finally {
        reply.raw.end();
      }
    } catch (err: any) {
      fastify.log.error({ err, route: "/chat" }, "Failed to generate chat response.");
      return reply.status(500).send({ error: err.message || "Failed to generate chat response." });
    }
  });
}
