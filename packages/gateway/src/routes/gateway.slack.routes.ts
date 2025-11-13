import { type ConnectorSlackService, connectorServiceFactory } from "@ait/connectors";
import { getPostgresClient, slackMessages, drizzleOrm } from "@ait/postgres";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    slackService: ConnectorSlackService;
  }
}

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

const connectorType = "slack";

export default async function slackRoutes(fastify: FastifyInstance) {
  if (!fastify.slackService) {
    fastify.decorate("slackService", connectorServiceFactory.getService<ConnectorSlackService>(connectorType));
  }

  const slackService = fastify.slackService;

  fastify.get("/auth", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const clientId = process.env.SLACK_CLIENT_ID;
      const redirectUri = process.env.SLACK_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        fastify.log.error({ route: "/auth" }, "Missing SLACK_CLIENT_ID or SLACK_REDIRECT_URI environment variables.");
        return reply.status(500).send({ error: "Missing required Slack configuration." });
      }

      const baseUrl = process.env.SLACK_AUTH_URL || "https://slack.com/oauth/v2/authorize";

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        user_scope:
          "channels:read,groups:read,im:read,mpim:read,channels:history,groups:history,im:history,mpim:history,users:read",
        response_type: "code",
      });

      const authUrl = `${baseUrl}?${params.toString()}`;
      fastify.log.info({ authUrl, redirectUri, clientId }, "Redirecting to Slack OAuth");
      reply.redirect(authUrl);
    } catch (err: any) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate Slack authentication.");
      reply.status(500).send({ error: "Failed to initiate Slack authentication." });
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
        await slackService.connector.connect(code);

        const messages = await slackService.getMessages();
        await slackService.connector.store.save(messages);

        reply.send({
          messages,
        });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.get("/messages", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const messages = await slackService.getMessages();
      reply.send(messages);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/messages" }, "Failed to fetch messages.");
      reply.status(500).send({ error: "Failed to fetch messages." });
    }
  });

  // Paginated data route
  fastify.get(
    "/data/messages",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);
        const offset = (page - 1) * limit;

        const { db } = getPostgresClient();

        const [messages, totalResult] = await Promise.all([
          db.select().from(slackMessages).orderBy(drizzleOrm.desc(slackMessages.updatedAt)).limit(limit).offset(offset),
          db.select({ count: drizzleOrm.count() }).from(slackMessages),
        ]);

        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        reply.send({
          data: messages,
          pagination: { page, limit, total, totalPages },
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/messages" }, "Failed to fetch messages from DB.");
        reply.status(500).send({ error: "Failed to fetch messages from database." });
      }
    },
  );

  // Refresh endpoint
  fastify.post("/refresh", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const messages = await slackService.getMessages();
      await slackService.connector.store.save(messages);

      reply.send({
        success: true,
        message: "Slack data refreshed successfully",
        counts: {
          messages: messages.length,
        },
      });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/refresh" }, "Failed to refresh Slack data.");
      reply.status(500).send({ error: "Failed to refresh Slack data." });
    }
  });
}
