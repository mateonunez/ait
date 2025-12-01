import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GenerationModels,
  STREAM_EVENT,
  type StreamEvent,
  type TextGenerationService,
  createAllConnectorTools,
  getLangfuseProvider,
  getTextGenerationService,
  initAItClient,
} from "@ait/ai-sdk";
import type { ChatMessage } from "@ait/ai-sdk";
import { type ConnectorSpotifyService, connectorServiceFactory } from "@ait/connectors";
import { getLogger } from "@ait/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

// Read version from package.json
const logger = getLogger();
const packageJson = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));
const APP_VERSION = packageJson.version;
const APP_ENVIRONMENT = process.env.NODE_ENV || "development";
const DEPLOYMENT_TIMESTAMP = new Date().toISOString();

declare module "fastify" {
  interface FastifyInstance {
    textGenerationService: TextGenerationService;
    spotifyService: ConnectorSpotifyService;
  }
}

interface ChatRequestBody {
  messages: ChatMessage[];
  model?: string;
  enableMetadata?: boolean;
}

const telemetryEnabled = process.env.LANGFUSE_ENABLED === "true";
const telemetryConfig = {
  enabled: telemetryEnabled,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseURL: process.env.LANGFUSE_BASEURL || "https://localhost:3000",
  flushAt: 1,
  flushInterval: 1000,
};

initAItClient({
  generation: {
    model: GenerationModels.GPT_OSS_20B_CLOUD,
    temperature: 1,
  },
  telemetry: telemetryConfig,
});

function isTextChunk(event: StreamEvent): event is StreamEvent & { type: typeof STREAM_EVENT.TEXT } {
  return event.type === STREAM_EVENT.TEXT;
}

function isMetadataChunk(event: StreamEvent): event is StreamEvent & { type: typeof STREAM_EVENT.METADATA } {
  return event.type === STREAM_EVENT.METADATA;
}

function isCompletionData(event: StreamEvent): event is StreamEvent & { type: typeof STREAM_EVENT.DATA } {
  return event.type === STREAM_EVENT.DATA;
}

function isErrorEvent(event: StreamEvent): event is StreamEvent & { type: typeof STREAM_EVENT.ERROR } {
  return event.type === STREAM_EVENT.ERROR;
}

if (!(global as any).__messageToTraceMap) {
  (global as any).__messageToTraceMap = {};
}

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
      const { messages, model, enableMetadata = true } = request.body;

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
        // Generate custom traceId for telemetry
        const traceId = `trace-${Date.now()}-${randomUUID().slice(0, 8)}`;

        logger.info("Generating stream", {
          prompt,
          conversationHistory,
          tools,
          maxToolRounds: 1,
          enableTelemetry: process.env.LANGFUSE_ENABLED === "true",
          enableMetadata,
          traceId,
        });

        const stream = textGenerationService.generateStream({
          prompt,
          enableRAG: true,
          messages: conversationHistory,
          tools,
          maxToolRounds: 1,
          enableTelemetry: process.env.LANGFUSE_ENABLED === "true",
          enableMetadata,
          traceId,
          userId: request.headers["x-user-id"] as string | undefined,
          sessionId: request.headers["x-session-id"] as string | undefined,
          tags: ["gateway", "chat"],
          metadata: {
            version: APP_VERSION,
            environment: APP_ENVIRONMENT,
            deploymentTimestamp: DEPLOYMENT_TIMESTAMP,
            model: model || "default",
          },
        });

        let firstChunk = true;
        for await (const chunk of stream) {
          if (typeof chunk === "string") {
            reply.raw.write(`${STREAM_EVENT.TEXT}:${JSON.stringify(chunk)}\n`);
          } else {
            const event = chunk as StreamEvent;

            if (isTextChunk(event)) {
              reply.raw.write(`${STREAM_EVENT.TEXT}:${JSON.stringify(event.data)}\n`);
            } else if (isMetadataChunk(event)) {
              reply.raw.write(`${STREAM_EVENT.METADATA}:${JSON.stringify(event.data)}\n`);
            } else if (isCompletionData(event)) {
              reply.raw.write(`${STREAM_EVENT.DATA}:${JSON.stringify(event.data)}\n`);
            } else if (isErrorEvent(event)) {
              reply.raw.write(`${STREAM_EVENT.ERROR}:${JSON.stringify(event.data)}\n`);
            }
          }

          if (firstChunk) {
            const timestamp = Date.now();
            (global as any).__messageToTraceMap[timestamp] = traceId;
            const fiveMinutesAgo = timestamp - 5 * 60 * 1000;
            for (const key of Object.keys((global as any).__messageToTraceMap)) {
              if (Number.parseInt(key) < fiveMinutesAgo) {
                delete (global as any).__messageToTraceMap[key];
              }
            }
            firstChunk = false;
          }
        }

        reply.raw.write(`${STREAM_EVENT.DATA}:${JSON.stringify({ finishReason: "stop", traceId })}\n`);

        const langfuseProvider = getLangfuseProvider();
        if (langfuseProvider?.isEnabled()) {
          try {
            await langfuseProvider.flush();
          } catch (flushError: unknown) {
            logger.error("[Gateway] Telemetry flush failed:", {
              error: flushError instanceof Error ? flushError.message : String(flushError),
            });
            // Don't fail the request if telemetry flush fails
          }
        }
      } catch (streamError: unknown) {
        fastify.log.error({ err: streamError, route: "/chat" }, "Stream error occurred.");
        reply.raw.write(
          `${STREAM_EVENT.ERROR}:${JSON.stringify(streamError instanceof Error ? streamError.message : String(streamError) || "Stream generation failed")}\n`,
        );

        const langfuseProvider = getLangfuseProvider();
        if (langfuseProvider?.isEnabled()) {
          try {
            await langfuseProvider.flush();
          } catch {
            // Silently fail telemetry flush on error
          }
        }
      } finally {
        reply.raw.end();
      }
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/chat" }, "Failed to generate chat response.");
      return reply
        .status(500)
        .send({ error: err instanceof Error ? err.message : String(err) || "Failed to generate chat response." });
    }
  });
}
