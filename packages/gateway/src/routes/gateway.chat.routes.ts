import {
  createAllConnectorTools,
  GenerationModels,
  getTextGenerationService,
  initAItClient,
  getLangfuseProvider,
  type TextGenerationService,
  type StreamEvent,
  STREAM_EVENT,
  isTextChunk,
  isMetadataChunk,
  isCompletionData,
  isErrorEvent,
} from "@ait/ai-sdk";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ChatMessage } from "@ait/ai-sdk";
import { connectorServiceFactory, type ConnectorSpotifyService } from "@ait/connectors";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// Read version from package.json
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

// Initialize AI SDK with telemetry
const telemetryEnabled = process.env.LANGFUSE_ENABLED === "true";
const telemetryConfig = {
  enabled: telemetryEnabled,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseURL: process.env.LANGFUSE_BASEURL || "http://localhost:3000",
  flushAt: 1, // Flush immediately
  flushInterval: 1000, // Flush every second
};

initAItClient({
  generation: {
    model: GenerationModels.GPT_OSS_20B_CLOUD,
    temperature: 1,
  },
  telemetry: telemetryConfig,
});

// Log telemetry status on startup
console.log("[Gateway] Telemetry configuration:", {
  enabled: telemetryEnabled,
  hasPublicKey: !!telemetryConfig.publicKey,
  hasSecretKey: !!telemetryConfig.secretKey,
  baseURL: telemetryConfig.baseURL,
});

// Global message-to-trace mapping for feedback correlation
// In production, this should be stored in a database or cache
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

        const stream = textGenerationService.generateStream({
          prompt,
          enableRAG: true,
          messages: conversationHistory,
          tools,
          maxToolRounds: 1,
          enableTelemetry: process.env.LANGFUSE_ENABLED === "true",
          enableMetadata, // Enable metadata streaming
          traceId, // Pass custom traceId
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
          // Check if chunk is a string (old format) or StreamEvent (new format)
          if (typeof chunk === "string") {
            // Text chunk - use text event type
            reply.raw.write(`${STREAM_EVENT.TEXT}:${JSON.stringify(chunk)}\n`);
          } else {
            // StreamEvent - handle different event types
            const event = chunk as StreamEvent;

            if (isTextChunk(event)) {
              // Text content
              reply.raw.write(`${STREAM_EVENT.TEXT}:${JSON.stringify(event.data)}\n`);
            } else if (isMetadataChunk(event)) {
              // Metadata (context, reasoning, tasks, suggestions, etc.)
              reply.raw.write(`${STREAM_EVENT.METADATA}:${JSON.stringify(event.data)}\n`);
            } else if (isCompletionData(event)) {
              // Completion data
              reply.raw.write(`${STREAM_EVENT.DATA}:${JSON.stringify(event.data)}\n`);
            } else if (isErrorEvent(event)) {
              // Error event
              reply.raw.write(`${STREAM_EVENT.ERROR}:${JSON.stringify(event.data)}\n`);
            }
          }

          // On first chunk, store the traceId mapping for feedback
          if (firstChunk) {
            const timestamp = Date.now();
            (global as any).__messageToTraceMap[timestamp] = traceId;
            // Clean up old mappings (older than 5 minutes)
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

        // Flush telemetry data to Langfuse with proper timing
        const langfuseProvider = getLangfuseProvider();
        if (langfuseProvider?.isEnabled()) {
          console.log("[Gateway] Flushing telemetry data to Langfuse...");

          try {
            // Give a small delay to ensure all trace updates are processed
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Flush with timeout protection
            const flushTimeout = 15000; // 15 seconds
            await Promise.race([
              langfuseProvider.flush(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Flush timeout in gateway")), flushTimeout)),
            ]);

            console.log("[Gateway] Telemetry flushed successfully");
          } catch (flushError: any) {
            console.error("[Gateway] Telemetry flush failed:", flushError.message);
            // Don't fail the request if telemetry flush fails
          }
        }
      } catch (streamError: any) {
        fastify.log.error({ err: streamError, route: "/chat" }, "Stream error occurred.");
        reply.raw.write(`${STREAM_EVENT.ERROR}:${JSON.stringify(streamError.message || "Stream generation failed")}\n`);

        // Attempt to flush telemetry even on error
        const langfuseProvider = getLangfuseProvider();
        if (langfuseProvider?.isEnabled()) {
          try {
            await Promise.race([langfuseProvider.flush(), new Promise((resolve) => setTimeout(resolve, 5000))]);
          } catch {
            // Silently fail telemetry flush on error
          }
        }
      } finally {
        reply.raw.end();
      }
    } catch (err: any) {
      fastify.log.error({ err, route: "/chat" }, "Failed to generate chat response.");
      return reply.status(500).send({ error: err.message || "Failed to generate chat response." });
    }
  });
}
