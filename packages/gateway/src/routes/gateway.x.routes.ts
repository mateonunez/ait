import { type ConnectorXService, X_ENTITY_TYPES_ENUM, clearOAuthData, connectorServiceFactory } from "@ait/connectors";
import { type XEntityType, getLogger } from "@ait/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthQuery, OAuthCallbackQuery, PaginationQuery } from "../types/route.types";

const logger = getLogger();

const connectorType = "x";

export default async function xRoutes(fastify: FastifyInstance) {
  const getService = async (
    request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>,
    configId?: string,
  ): Promise<ConnectorXService> => {
    const query = request.query;
    let userId = (request.headers["x-user-id"] || query.userId) as string | undefined;

    const state = query.state;
    if (!userId && state && typeof state === "string" && state.includes(":")) {
      userId = state.split(":")[1];
    }

    const currentUserId = userId || "anonymous";

    if (configId) {
      return await connectorServiceFactory.getServiceByConfig<ConnectorXService>(configId, currentUserId);
    }

    return connectorServiceFactory.getService<ConnectorXService>(connectorType);
  };

  fastify.get("/auth", async (request: FastifyRequest<{ Querystring: AuthQuery }>, reply: FastifyReply) => {
    try {
      const { configId, userId: queryUserId } = request.query;
      if (!configId) return reply.status(400).send({ error: "Missing configId" });

      const service = await getService(request as FastifyRequest<{ Querystring: OAuthCallbackQuery }>, configId);
      const userId = (request.headers["x-user-id"] || queryUserId) as string;
      const authUrl = service.connector.authenticator.getAuthorizationUrl();

      // X OAuth2 using state as configId:userId
      const url = new URL(authUrl);
      url.searchParams.set("state", `${configId}:${userId}`);

      reply.redirect(url.toString());
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate X authentication.");
      reply.status(500).send({ error: "Failed to initiate X authentication." });
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
        fastify.log.error({ err, route: "/auth/callback" }, "X authentication failed.");
        reply.status(500).send({ error: "X authentication failed." });
      }
    },
  );

  fastify.post(
    "/auth/disconnect",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const userId = request.headers["x-user-id"] as string;
        await clearOAuthData(connectorType, userId);
        reply.send({ success: true, message: "X disconnected successfully." });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/auth/disconnect" }, "Failed to disconnect X.");
        reply.status(500).send({ error: "Failed to disconnect X." });
      }
    },
  );

  fastify.get(
    "/tweets",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const tweets = await service.fetchTweets();
        reply.send(tweets);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/tweets" }, "Failed to fetch X tweets.");
        reply.status(500).send({ error: "Failed to fetch X tweets." });
      }
    },
  );

  // Paginated data route
  fastify.get(
    "/data/tweets",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getTweetsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/tweets" }, "Failed to fetch tweets from DB.");
        reply.status(500).send({ error: "Failed to fetch tweets from database." });
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
          : ["tweets"];

        const counts: Record<string, number> = {};

        // Helper for progressive paginated fetching - saves each batch immediately
        const fetchAndStoreProgressively = async (
          entityType: string,
          generator: AsyncGenerator<unknown[], void, unknown>,
        ): Promise<number> => {
          let count = 0;
          try {
            for await (const batch of generator) {
              await service.connector.store.save(batch as XEntityType[]);
              count += batch.length;
            }
          } catch (error) {
            logger.warn(`${entityType} refresh stopped after ${count} items`, { error });
          }
          return count;
        };

        if (entitiesToRefresh.includes("tweets")) {
          counts.tweets = await fetchAndStoreProgressively(
            "tweets",
            service.fetchEntitiesPaginated(X_ENTITY_TYPES_ENUM.TWEET, true, true),
          );
        }

        reply.send({
          success: true,
          message: "X data refreshed successfully",
          counts,
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/refresh" }, "Failed to refresh X data.");
        reply.status(500).send({ error: "Failed to refresh X data." });
      }
    },
  );
}
