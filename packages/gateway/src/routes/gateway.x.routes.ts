import { type ConnectorXService, connectorServiceFactory, clearOAuthData } from "@ait/connectors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    xService: ConnectorXService;
  }
}

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

const connectorType = "x";

export default async function xRoutes(fastify: FastifyInstance) {
  if (!fastify.xService) {
    fastify.decorate("xService", connectorServiceFactory.getService<ConnectorXService>(connectorType));
  }

  const xService = fastify.xService;
  const store = xService.connector.store;
  const authenticator = xService.connector.authenticator;

  fastify.get("/auth", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authUrl = authenticator.getAuthorizationUrl();
      reply.redirect(authUrl);
    } catch (err: any) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate X authentication.");
      reply.status(500).send({ error: "Failed to initiate X authentication." });
    }
  });

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery }>, reply: FastifyReply) => {
      const { code } = request.query;

      if (!code) {
        fastify.log.error({ route: "/auth/callback" }, "Missing authorization code.");
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        await xService.connector.connect(code);

        // Data fetching is now handled separately via the /refresh endpoint or background jobs
        // to avoid timeout issues during the auth callback.

        reply.send({
          success: true,
          message: "Authentication successful. You can close this window.",
        });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "X authentication failed.");
        reply.status(500).send({ error: "X authentication failed." });
      }
    },
  );

  fastify.post("/auth/disconnect", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await clearOAuthData(connectorType);
      reply.send({ success: true, message: "X disconnected successfully." });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/auth/disconnect" }, "Failed to disconnect X.");
      reply.status(500).send({ error: "Failed to disconnect X." });
    }
  });

  fastify.get("/tweets", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tweets = await xService.fetchTweets();
      reply.send(tweets);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/tweets" }, "Failed to fetch X tweets.");
      reply.status(500).send({ error: "Failed to fetch X tweets." });
    }
  });

  // Paginated data route
  fastify.get(
    "/data/tweets",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await xService.getTweetsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/tweets" }, "Failed to fetch tweets from DB.");
        reply.status(500).send({ error: "Failed to fetch tweets from database." });
      }
    },
  );

  // Refresh endpoint with optional entity filter
  // Usage: POST /refresh?entities=tweets or POST /refresh (all entities)
  fastify.post(
    "/refresh",
    async (request: FastifyRequest<{ Querystring: { entities?: string } }>, reply: FastifyReply) => {
      try {
        const { entities: entitiesParam } = request.query;
        const entitiesToRefresh = entitiesParam
          ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
          : ["tweets"];

        const counts: Record<string, number> = {};

        if (entitiesToRefresh.includes("tweets")) {
          const tweets = await xService.fetchTweets();
          await store.save(tweets);
          counts.tweets = tweets.length;
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
