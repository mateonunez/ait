import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GenerationModels,
  type MCPClientManager,
  STREAM_EVENT,
  type StreamEvent,
  type TextGenerationService,
  createAllConnectorToolsWithMCP,
  getLangfuseProvider,
  getMCPClientManager,
  getTextGenerationService,
  initAItClient,
} from "@ait/ai-sdk";
import type { ChatMessage } from "@ait/ai-sdk";
import {
  type ConnectorGitHubService,
  type ConnectorLinearService,
  type ConnectorNotionService,
  type ConnectorSlackService,
  type ConnectorSpotifyService,
  connectorServiceFactory,
} from "@ait/connectors";
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
    notionService: ConnectorNotionService;
    githubService: ConnectorGitHubService;
    linearService: ConnectorLinearService;
    slackService: ConnectorSlackService;
    mcpManager: MCPClientManager;
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

/**
 * Initialize MCP connections for available connectors
 * Connects to vendor-hosted MCP servers using existing OAuth tokens
 */
async function initializeMCPConnections(
  mcpManager: MCPClientManager,
  notionService: ConnectorNotionService,
  githubService: ConnectorGitHubService,
  linearService: ConnectorLinearService,
  slackService: ConnectorSlackService,
): Promise<void> {
  // Try to connect Notion MCP if authenticated
  try {
    await notionService.connector.connect();
    const notionAuth = await notionService.connector.store.getAuthenticationData();
    if (notionAuth?.accessToken) {
      await mcpManager.connect("notion", { accessToken: notionAuth.accessToken });
      logger.info("[MCP] Connected to Notion MCP server");
    }
  } catch (error) {
    logger.debug("[MCP] Notion not authenticated, skipping MCP connection", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Try to connect GitHub MCP if authenticated
  try {
    await githubService.connector.connect();
    const githubAuth = await githubService.connector.store.getAuthenticationData();
    if (githubAuth?.accessToken) {
      await mcpManager.connect("github", { accessToken: githubAuth.accessToken });
      logger.info("[MCP] Connected to GitHub MCP server");
    }
  } catch (error) {
    logger.debug("[MCP] GitHub not authenticated, skipping MCP connection", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Try to connect Linear MCP if authenticated
  try {
    await linearService.connector.connect();
    const linearAuth = await linearService.connector.store.getAuthenticationData();
    if (linearAuth?.accessToken) {
      await mcpManager.connect("linear", { accessToken: linearAuth.accessToken });
      logger.info("[MCP] Connected to Linear MCP server");
    }
  } catch (error) {
    logger.debug("[MCP] Linear not authenticated, skipping MCP connection", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Try to connect Slack MCP if authenticated
  try {
    await slackService.connector.connect();
    const slackAuth = await slackService.connector.store.getAuthenticationData();
    if (slackAuth?.accessToken) {
      const teamId = (slackAuth.metadata as { team_id?: string })?.team_id;
      const env: Record<string, string> = {};
      if (teamId) {
        env.SLACK_TEAM_ID = teamId;
      }
      await mcpManager.connect("slack", { accessToken: slackAuth.accessToken, env });
      logger.info("[MCP] Connected to Slack MCP server");
    }
  } catch (error) {
    logger.debug("[MCP] Slack not authenticated, skipping MCP connection", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export default async function chatRoutes(fastify: FastifyInstance) {
  // Initialize services
  if (!fastify.textGenerationService) {
    fastify.decorate("textGenerationService", getTextGenerationService());
  }

  if (!fastify.spotifyService) {
    fastify.decorate("spotifyService", connectorServiceFactory.getService<ConnectorSpotifyService>("spotify"));
  }

  if (!fastify.notionService) {
    fastify.decorate("notionService", connectorServiceFactory.getService<ConnectorNotionService>("notion"));
  }

  if (!fastify.githubService) {
    fastify.decorate("githubService", connectorServiceFactory.getService<ConnectorGitHubService>("github"));
  }

  if (!fastify.linearService) {
    fastify.decorate("linearService", connectorServiceFactory.getService<ConnectorLinearService>("linear"));
  }

  if (!fastify.slackService) {
    fastify.decorate("slackService", connectorServiceFactory.getService<ConnectorSlackService>("slack"));
  }

  if (!fastify.mcpManager) {
    fastify.decorate("mcpManager", getMCPClientManager());
  }

  const textGenerationService = fastify.textGenerationService;
  const mcpManager = fastify.mcpManager;

  // Initialize MCP connections in the background (don't block startup)
  initializeMCPConnections(
    mcpManager,
    fastify.notionService,
    fastify.githubService,
    fastify.linearService,
    fastify.slackService,
  ).catch((error) => {
    logger.warn("[MCP] Failed to initialize MCP connections:", {
      error: error instanceof Error ? error.message : String(error),
    });
  });

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

        const tools = await createAllConnectorToolsWithMCP(fastify.spotifyService, mcpManager);
        const hasMCPConnected = mcpManager.getConnectedVendors().length > 0;
        const maxToolRounds = hasMCPConnected ? 3 : 1;

        logger.info("Generating stream with MCP tools", {
          prompt,
          conversationHistory,
          toolCount: Object.keys(tools).length,
          mcpConnected: mcpManager.getConnectedVendors(),
          maxToolRounds,
          enableTelemetry: process.env.LANGFUSE_ENABLED === "true",
          enableMetadata,
          traceId,
        });

        const stream = textGenerationService.generateStream({
          prompt,
          enableRAG: true,
          messages: conversationHistory,
          tools,
          maxToolRounds,
          enableTelemetry: process.env.LANGFUSE_ENABLED === "true",
          enableMetadata,
          traceId,
          userId: request.headers["x-user-id"] as string | undefined,
          sessionId: request.headers["x-session-id"] as string | undefined,
          tags: ["gateway", "chat", "mcp"],
          metadata: {
            version: APP_VERSION,
            environment: APP_ENVIRONMENT,
            deploymentTimestamp: DEPLOYMENT_TIMESTAMP,
            model: model || "default",
            mcpVendors: mcpManager.getConnectedVendors().join(","),
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
