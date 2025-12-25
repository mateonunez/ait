import { type ConnectorNotionService, connectorServiceFactory, clearOAuthData } from "@ait/connectors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    notionService: ConnectorNotionService;
  }
}

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

const connectorType = "notion";

export default async function notionRoutes(fastify: FastifyInstance) {
  if (!fastify.notionService) {
    fastify.decorate("notionService", connectorServiceFactory.getService<ConnectorNotionService>(connectorType));
  }

  const notionService = fastify.notionService;

  fastify.get("/auth", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const clientId = process.env.NOTION_CLIENT_ID;
      const redirectUri = process.env.NOTION_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        fastify.log.error({ route: "/auth" }, "Missing NOTION_CLIENT_ID or NOTION_REDIRECT_URI environment variables.");
        return reply.status(500).send({ error: "Missing required Notion configuration." });
      }

      const baseUrl = process.env.NOTION_AUTH_URL || "https://www.notion.so/install-integration";
      const cleanBaseUrl = baseUrl.split("?")[0];

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        owner: "user",
      });

      const authUrl = `${cleanBaseUrl}?${params.toString()}`;
      fastify.log.info({ authUrl, redirectUri, clientId }, "Redirecting to Notion OAuth");
      reply.redirect(authUrl);
    } catch (err: any) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate Notion authentication.");
      reply.status(500).send({ error: "Failed to initiate Notion authentication." });
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
        await notionService.connector.connect(code);

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

  fastify.post("/auth/disconnect", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await clearOAuthData(connectorType);
      reply.send({ success: true, message: "Notion disconnected successfully." });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/auth/disconnect" }, "Failed to disconnect Notion.");
      reply.status(500).send({ error: "Failed to disconnect Notion." });
    }
  });

  fastify.get("/pages", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const pages = await notionService.fetchPages();
      reply.send(pages);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/pages" }, "Failed to fetch pages.");
      reply.status(500).send({ error: "Failed to fetch pages." });
    }
  });

  fastify.get("/data/pages", async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
    try {
      const page = Number.parseInt(request.query.page || "1", 10);
      const limit = Number.parseInt(request.query.limit || "50", 10);

      const result = await notionService.getPagesPaginated({ page, limit });
      reply.send(result);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/data/pages" }, "Failed to fetch pages from DB.");
      reply.status(500).send({ error: "Failed to fetch pages from database." });
    }
  });

  fastify.post(
    "/refresh",
    async (request: FastifyRequest<{ Querystring: { entities?: string } }>, reply: FastifyReply) => {
      try {
        const { entities: entitiesParam } = request.query;
        const entitiesToRefresh = entitiesParam
          ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
          : ["pages"];

        const counts: Record<string, number> = {};

        if (entitiesToRefresh.includes("pages")) {
          const pages = await notionService.fetchPages();
          await notionService.connector.store.save(pages);
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
