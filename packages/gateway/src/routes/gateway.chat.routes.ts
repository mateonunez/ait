import { TextGenerationService, initAItClient } from "@ait/ai-sdk";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ChatMessage } from "@ait/ai-sdk";

declare module "fastify" {
  interface FastifyInstance {
    textGenerationService: TextGenerationService;
  }
}

interface ChatRequestBody {
  messages: ChatMessage[];
}

export default async function chatRoutes(fastify: FastifyInstance) {
  if (!fastify.textGenerationService) {
    initAItClient({
      generation: { model: "gemma3:latest", temperature: 0.7 },
      embeddings: { model: "mxbai-embed-large:latest" },
      rag: {
        collection: "ait_embeddings_collection",
        strategy: "multi-query",
        maxDocs: 100,
      },
      ollama: {
        baseURL: "http://127.0.0.1:11434",
      },
      logger: true,
    });

    fastify.decorate(
      "textGenerationService",
      new TextGenerationService({
        collectionName: "ait_embeddings_collection",
      }),
    );
  }

  const textGenerationService = fastify.textGenerationService;

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
