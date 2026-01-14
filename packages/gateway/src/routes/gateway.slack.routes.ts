import {
  type ConnectorSlackService,
  SLACK_ENTITY_TYPES_ENUM,
  clearOAuthData,
  connectorServiceFactory,
} from "@ait/connectors";
import { type SlackEntityType, getLogger } from "@ait/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthQuery, OAuthCallbackQuery, PaginationQuery } from "../types/route.types";

const logger = getLogger();

const connectorType = "slack";

export default async function slackRoutes(fastify: FastifyInstance) {
  const getService = async (
    request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>,
    configId?: string,
  ): Promise<ConnectorSlackService> => {
    const query = request.query;
    let userId = (request.headers["x-user-id"] || query.userId) as string | undefined;

    // Support extracting userId from OAuth state if it's encoded there
    const state = query.state;
    if (!userId && state && typeof state === "string" && state.includes(":")) {
      userId = state.split(":")[1];
    }

    const currentUserId = userId || "anonymous";

    if (configId) {
      return await connectorServiceFactory.getServiceByConfig<ConnectorSlackService>(configId, currentUserId);
    }

    // Fallback/Legacy
    return connectorServiceFactory.getService<ConnectorSlackService>(connectorType);
  };

  fastify.get("/auth", async (request: FastifyRequest<{ Querystring: AuthQuery }>, reply: FastifyReply) => {
    try {
      const { configId, userId: queryUserId } = request.query;
      if (!configId) return reply.status(400).send({ error: "Missing configId" });

      const service = await getService(request as FastifyRequest<{ Querystring: OAuthCallbackQuery }>, configId);
      const config = service.connector.authenticator.getOAuthConfig();

      const baseUrl = "https://slack.com/oauth/v2/authorize";

      const userId = (request.headers["x-user-id"] || queryUserId) as string;
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri!,
        user_scope:
          "channels:read,groups:read,im:read,mpim:read,channels:history,groups:history,im:history,mpim:history,users:read,chat:write",
        response_type: "code",
        state: `${configId}:${userId}`,
      });

      const authUrl = `${baseUrl}?${params.toString()}`;
      fastify.log.info({ authUrl, configId }, "Redirecting to Slack OAuth");
      reply.redirect(authUrl);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate Slack authentication.");
      reply.status(500).send({ error: "Failed to initiate Slack authentication." });
    }
  });

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
      const { code, state } = request.query;
      const [configId] = (state || "").split(":");

      if (!code) {
        fastify.log.error({ route: "/auth/callback" }, "Missing authorization code.");
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        const service = await getService(request, configId);
        await service.connector.connect(code);

        reply.send({
          success: true,
          message: "Authentication successful. You can close this window.",
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.post(
    "/auth/disconnect",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const userId = request.headers["x-user-id"] as string;
        await clearOAuthData(connectorType, userId);
        reply.send({ success: true, message: "Slack disconnected successfully." });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/auth/disconnect" }, "Failed to disconnect Slack.");
        reply.status(500).send({ error: "Failed to disconnect Slack." });
      }
    },
  );

  fastify.get(
    "/messages",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const messages = await service.fetchMessages();
        reply.send(messages);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/messages" }, "Failed to fetch messages.");
        reply.status(500).send({ error: "Failed to fetch messages." });
      }
    },
  );

  // Paginated data route
  fastify.get(
    "/data/messages",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getMessagesPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/messages" }, "Failed to fetch messages from DB.");
        reply.status(500).send({ error: "Failed to fetch messages from database." });
      }
    },
  );

  // Refresh endpoint with optional entity filter
  fastify.post(
    "/refresh",
    async (request: FastifyRequest<{ Querystring: { entities?: string; configId?: string } }>, reply: FastifyReply) => {
      try {
        const { entities: entitiesParam, configId } = request.query;
        const service = await getService(request, configId);

        const entitiesToRefresh = entitiesParam
          ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
          : ["messages"];

        const counts: Record<string, number> = {};

        // Helper for progressive paginated fetching - saves each batch immediately
        const fetchAndStoreProgressively = async (
          entityType: string,
          generator: AsyncGenerator<unknown[], void, unknown>,
        ): Promise<number> => {
          let count = 0;
          try {
            for await (const batch of generator) {
              await service.connector.store.save(batch as SlackEntityType[]);
              count += batch.length;
            }
          } catch (error) {
            logger.warn(`${entityType} refresh stopped after ${count} items`, { error });
          }
          return count;
        };

        if (entitiesToRefresh.includes("messages")) {
          counts.messages = await fetchAndStoreProgressively(
            "messages",
            service.fetchEntitiesPaginated(SLACK_ENTITY_TYPES_ENUM.MESSAGE, true, true),
          );
        }

        reply.send({
          success: true,
          message: "Slack data refreshed successfully",
          counts,
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/refresh" }, "Failed to refresh Slack data.");
        reply.status(500).send({ error: "Failed to refresh Slack data." });
      }
    },
  );
}
