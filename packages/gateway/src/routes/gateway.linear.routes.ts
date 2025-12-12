import { type ConnectorLinearService, connectorServiceFactory } from "@ait/connectors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    linearService: ConnectorLinearService;
  }
}

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

const connectorType = "linear";

export default async function linearRoutes(fastify: FastifyInstance) {
  if (!fastify.linearService) {
    fastify.decorate("linearService", connectorServiceFactory.getService<ConnectorLinearService>(connectorType));
  }

  const linearService = fastify.linearService;

  fastify.get("/auth", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = new URLSearchParams({
        client_id: process.env.LINEAR_CLIENT_ID!,
        redirect_uri: process.env.LINEAR_REDIRECT_URI!,
        response_type: "code",
        scope: "read,write",
      });

      const authUrl = `${process.env.LINEAR_AUTH_URL}?${params}`;
      reply.redirect(authUrl);
    } catch (err: any) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate Linear authentication.");
      reply.status(500).send({ error: "Failed to initiate Linear authentication." });
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
        await linearService.connector.connect(code);

        // Data fetching is now handled separately via the /refresh endpoint or background jobs
        // to avoid timeout issues during the auth callback.

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

  fastify.get("/issues", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const issues = await linearService.fetchIssues();
      reply.send(issues);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/issues" }, "Failed to fetch issues.");
      reply.status(500).send({ error: "Failed to fetch issues." });
    }
  });

  // Paginated data route
  fastify.get(
    "/data/issues",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await linearService.getIssuesPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/issues" }, "Failed to fetch issues from DB.");
        reply.status(500).send({ error: "Failed to fetch issues from database." });
      }
    },
  );

  // Refresh endpoint
  fastify.post("/refresh", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const issues = await linearService.fetchIssues();
      await linearService.connector.store.save(issues);

      reply.send({
        success: true,
        message: "Linear data refreshed successfully",
        counts: {
          issues: issues.length,
        },
      });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/refresh" }, "Failed to refresh Linear data.");
      reply.status(500).send({ error: "Failed to refresh Linear data." });
    }
  });
}
