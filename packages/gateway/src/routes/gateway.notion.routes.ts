import { type ConnectorNotionService, clearOAuthData, connectorServiceFactory } from "@ait/connectors";
import { getLogger } from "@ait/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const logger = getLogger();

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

const connectorType = "notion";

export default async function notionRoutes(fastify: FastifyInstance) {
  const getService = async (request: FastifyRequest, configId?: string): Promise<ConnectorNotionService> => {
    let userId = (request.headers["x-user-id"] || (request.query as any).userId) as string | undefined;

    // Support extracting userId from OAuth state if it's encoded there
    const state = (request.query as any).state;
    if (!userId && state && typeof state === "string" && state.includes(":")) {
      userId = state.split(":")[1];
    }

    const currentUserId = userId || "anonymous";

    if (configId) {
      return await connectorServiceFactory.getServiceByConfig<ConnectorNotionService>(configId, currentUserId);
    }

    // Fallback/Legacy
    return connectorServiceFactory.getService<ConnectorNotionService>(connectorType);
  };

  fastify.get("/auth", async (request: FastifyRequest<{ Querystring: { configId: string } }>, reply: FastifyReply) => {
    try {
      const { configId } = request.query;
      if (!configId) return reply.status(400).send({ error: "Missing configId" });

      const service = await getService(request, configId);
      const config = service.connector.authenticator.getOAuthConfig();

      const baseUrl = "https://www.notion.so/install-integration";

      const userId = (request.headers["x-user-id"] || (request.query as any).userId) as string;
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri!,
        response_type: "code",
        owner: "user",
        state: `${configId}:${userId}`,
      });

      const authUrl = `${baseUrl}?${params.toString()}`;
      fastify.log.info({ authUrl, configId }, "Redirecting to Notion OAuth");
      reply.redirect(authUrl);
    } catch (err: any) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate Notion authentication.");
      reply.status(500).send({ error: "Failed to initiate Notion authentication." });
    }
  });

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery & { state?: string } }>, reply: FastifyReply) => {
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
      } catch (err: any) {
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
        reply.send({ success: true, message: "Notion disconnected successfully." });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/auth/disconnect" }, "Failed to disconnect Notion.");
        reply.status(500).send({ error: "Failed to disconnect Notion." });
      }
    },
  );

  fastify.get(
    "/pages",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const pages = await service.fetchPages();
        reply.send(pages);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/pages" }, "Failed to fetch pages.");
        reply.status(500).send({ error: "Failed to fetch pages." });
      }
    },
  );

  fastify.get(
    "/data/pages",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getPagesPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/pages" }, "Failed to fetch pages from DB.");
        reply.status(500).send({ error: "Failed to fetch pages from database." });
      }
    },
  );

  fastify.post(
    "/refresh",
    async (request: FastifyRequest<{ Querystring: { entities?: string; configId?: string } }>, reply: FastifyReply) => {
      try {
        const { entities: entitiesParam, configId } = request.query;
        const service = await getService(request, configId);

        const entitiesToRefresh = entitiesParam
          ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
          : ["pages"];

        const counts: Record<string, number> = {};

        if (entitiesToRefresh.includes("pages")) {
          const pages = await service.fetchPages();
          await service.connector.store.save(pages);
          counts.pages = pages.length;
        }

        reply.send({
          success: true,
          message: "Notion data refreshed successfully",
          counts,
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/refresh" }, "Failed to refresh Notion data.");
        reply.status(500).send({ error: "Failed to refresh Notion data." });
      }
    },
  );
}
