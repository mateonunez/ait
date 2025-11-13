import { type ConnectorNotionService, connectorServiceFactory } from "@ait/connectors";
import { getPostgresClient, notionPages, drizzleOrm } from "@ait/postgres";
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

        const pages = await notionService.getPages();
        await notionService.connector.store.save(pages);

        reply.send({
          pages,
        });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.get("/pages", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const pages = await notionService.getPages();
      reply.send(pages);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/pages" }, "Failed to fetch pages.");
      reply.status(500).send({ error: "Failed to fetch pages." });
    }
  });

  // Paginated data route
  fastify.get("/data/pages", async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
    try {
      const page = Number.parseInt(request.query.page || "1", 10);
      const limit = Number.parseInt(request.query.limit || "50", 10);
      const offset = (page - 1) * limit;

      const { db } = getPostgresClient();

      const [pages, totalResult] = await Promise.all([
        db.select().from(notionPages).orderBy(drizzleOrm.desc(notionPages.updatedAt)).limit(limit).offset(offset),
        db.select({ count: drizzleOrm.count() }).from(notionPages),
      ]);

      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      reply.send({
        data: pages,
        pagination: { page, limit, total, totalPages },
      });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/data/pages" }, "Failed to fetch pages from DB.");
      reply.status(500).send({ error: "Failed to fetch pages from database." });
    }
  });

  // Refresh endpoint
  fastify.post("/refresh", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const pages = await notionService.getPages();
      await notionService.connector.store.save(pages);

      reply.send({
        success: true,
        message: "Notion data refreshed successfully",
        counts: {
          pages: pages.length,
        },
      });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/refresh" }, "Failed to refresh Notion data.");
      reply.status(500).send({ error: "Failed to refresh Notion data." });
    }
  });
}
