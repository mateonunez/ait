import { randomUUID } from "node:crypto";
import {
  STREAM_EVENT,
  createAllConnectorToolsWithMCP,
  getLangfuseProvider,
  getMCPClientManager,
  getTextGenerationService,
  initAItClient,
} from "@ait/ai-sdk";
import type { MCPClientManager, TextGenerationService } from "@ait/ai-sdk";
import { connectorGrantService, getUserConnectorManager } from "@ait/connectors";
import { getLogger } from "@ait/core";
import { getConversationService } from "@ait/store";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { APP_ENVIRONMENT, APP_VERSION, DEPLOYMENT_TIMESTAMP } from "../config/app.config";
import { telemetryConfig } from "../config/telemetry.config";
import { type ChatRequestBody, validateChatRequest } from "../services/chat/chat-request.validator";
import { getChatStreamHandler } from "../services/chat/chat-stream.handler";
import { getMCPInitializerService } from "../services/chat/mcp-initializer.service";

declare module "fastify" {
  interface FastifyInstance {
    textGenerationService: TextGenerationService;
    mcpManager: MCPClientManager;
  }
}

const logger = getLogger();

initAItClient({
  telemetry: telemetryConfig,
});

export default async function chatRoutes(fastify: FastifyInstance) {
  if (!fastify.textGenerationService) {
    fastify.decorate("textGenerationService", getTextGenerationService());
  }

  if (!fastify.mcpManager) {
    fastify.decorate("mcpManager", getMCPClientManager());
  }

  const textGenerationService = fastify.textGenerationService;
  const mcpManager = fastify.mcpManager;
  const mcpInitializer = getMCPInitializerService();
  const streamHandler = getChatStreamHandler();

  fastify.post("/", async (request: FastifyRequest<{ Body: ChatRequestBody }>, reply: FastifyReply) => {
    try {
      const validation = validateChatRequest(request.body);
      if (!validation.isValid) {
        return reply.status(400).send({ error: validation.error });
      }

      const { prompt, conversationHistory } = validation;
      const { model, enableMetadata = true } = request.body;

      // Set headers for streaming
      reply.raw.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
      reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
      reply.raw.setHeader("Content-Type", "text/plain; charset=utf-8");
      reply.raw.setHeader("Transfer-Encoding", "chunked");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("X-Vercel-AI-Data-Stream", "v1");

      reply.hijack();

      try {
        const traceId = `trace-${Date.now()}-${randomUUID().slice(0, 8)}`;
        const userId = request.headers["x-user-id"] as string | undefined;

        let allowedVendors: Set<string> | undefined;
        let userServices = {};
        if (userId) {
          allowedVendors = await connectorGrantService.getGrantedVendors(userId);
          userServices = await getUserConnectorManager().getServices(userId);
          await mcpInitializer.initializeForUser(userId, mcpManager, userServices);
        }

        const tools = await createAllConnectorToolsWithMCP((userServices as any).spotify, mcpManager, allowedVendors);
        const hasMCPConnected = mcpManager.getConnectedVendors().length > 0;
        const maxToolRounds = hasMCPConnected ? 6 : 1;

        logger.info(
          `💬 Chat: Processing (${Object.keys(tools).length} tools, ${mcpManager.getConnectedVendors().length} MCP vendors)`,
        );

        const telemetryOptions = {
          enableTelemetry: telemetryConfig.enabled,
          traceId,
          userId,
          sessionId: request.headers["x-session-id"] as string | undefined,
          tags: ["gateway", "chat", "mcp"],
          metadata: {
            version: APP_VERSION,
            environment: APP_ENVIRONMENT,
            deploymentTimestamp: DEPLOYMENT_TIMESTAMP,
            model: model || "default",
            mcpVendors: mcpManager.getConnectedVendors().join(","),
            allowedVendors: allowedVendors ? Array.from(allowedVendors).join(",") : "none",
          },
        };

        const stream = textGenerationService.generateStream({
          prompt: prompt!,
          enableRAG: true,
          messages: conversationHistory!,
          tools,
          maxToolRounds,
          telemetryOptions,
          enableMetadata,
          model,
          allowedVendors,
        });

        const conversationService = getConversationService();
        let conversationId = request.body.conversationId;

        if (!conversationId) {
          const title = await textGenerationService.generateText({
            prompt: `You're an expert at generating titles for conversations, based on Nietzsche's style. Generate a 33 chars title for the following prompt, do not include any additional text or characters, simple text and concise: ${prompt}`,
            telemetryOptions,
            model,
          });

          const conversation = await conversationService.createConversation({
            title,
            userId,
            metadata: { model: model || "default" },
          });
          conversationId = conversation.id;
        }

        await conversationService.addMessage({
          conversationId,
          role: "user",
          content: prompt!,
          metadata: telemetryOptions,
          traceId,
        });

        const { assistantResponse, hadError } = await streamHandler.handleStream({
          stream,
          reply,
          traceId,
          onError: (error) => {
            fastify.log.error({ reqId: request.id, traceId, route: "/chat", error }, "Generation error event emitted.");
          },
        });

        if (!hadError && assistantResponse.trim()) {
          await conversationService.addMessage({
            conversationId: conversationId!,
            role: "assistant",
            content: assistantResponse,
            metadata: {
              model: model || "default",
              mcpVendors: mcpManager.getConnectedVendors(),
            },
            traceId,
          });
        }

        reply.raw.write(
          `${STREAM_EVENT.DATA}:${JSON.stringify({ finishReason: hadError ? "error" : "stop", traceId, conversationId })}\n`,
        );

        await flushTelemetry();
      } catch (streamError: unknown) {
        fastify.log.error({ err: streamError, route: "/chat" }, "Stream error occurred.");
        reply.raw.write(
          `${STREAM_EVENT.ERROR}:${JSON.stringify(streamError instanceof Error ? streamError.message : String(streamError) || "Stream generation failed")}\n`,
        );
        await flushTelemetry();
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

async function flushTelemetry() {
  const langfuseProvider = getLangfuseProvider();
  if (langfuseProvider?.isEnabled()) {
    try {
      await langfuseProvider.flush();
    } catch (flushError: unknown) {
      logger.error("[Gateway] Telemetry flush failed:", {
        error: flushError instanceof Error ? flushError.message : String(flushError),
      });
    }
  }
}
