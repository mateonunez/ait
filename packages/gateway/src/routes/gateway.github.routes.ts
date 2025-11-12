import { type ConnectorGitHubService, connectorServiceFactory } from "@ait/connectors";
import { getPostgresClient, githubRepositories, githubPullRequests, drizzleOrm } from "@ait/postgres";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    githubService: ConnectorGitHubService;
  }
}

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

const connectorType = "github";

export default async function githubRoutes(fastify: FastifyInstance) {
  if (!fastify.githubService) {
    fastify.decorate("githubService", connectorServiceFactory.getService<ConnectorGitHubService>(connectorType));
  }

  const githubService = fastify.githubService;

  fastify.get("/auth", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID!,
        redirect_uri: process.env.GITHUB_REDIRECT_URI!,
        scope: "repo",
      });

      const authUrl = `${process.env.GITHUB_AUTH_URL}?${params}`;
      reply.redirect(authUrl);
    } catch (err: any) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate GitHub authentication.");
      reply.status(500).send({ error: "Failed to initiate GitHub authentication." });
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
        await githubService.connector.connect(code);

        const repositories = await githubService.getRepositories();
        await githubService.connector.store.save(repositories);

        const pullRequests = await githubService.getPullRequests();
        await githubService.connector.store.save(pullRequests);

        reply.send({
          repositories,
          pullRequests,
        });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.get("/repositories", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const repositories = await githubService.getRepositories();
      reply.send(repositories);
    } catch (err: any) {
      fastify.log.error({ err, route: "/repositories" }, "Failed to fetch repositories.");
      reply.status(500).send({ error: "Failed to fetch repositories." });
    }
  });

  // Paginated data routes
  fastify.get(
    "/data/repositories",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);
        const offset = (page - 1) * limit;

        const { db } = getPostgresClient();

        const [repositories, totalResult] = await Promise.all([
          db
            .select()
            .from(githubRepositories)
            .orderBy(drizzleOrm.desc(githubRepositories.pushedAt))
            .limit(limit)
            .offset(offset),
          db.select({ count: drizzleOrm.count() }).from(githubRepositories),
        ]);

        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        reply.send({
          data: repositories,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/repositories" }, "Failed to fetch repositories from DB.");
        reply.status(500).send({ error: "Failed to fetch repositories from database." });
      }
    },
  );

  fastify.get(
    "/data/pull-requests",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);
        const offset = (page - 1) * limit;

        const { db } = getPostgresClient();

        const [pullRequests, totalResult] = await Promise.all([
          db
            .select()
            .from(githubPullRequests)
            .orderBy(drizzleOrm.desc(githubPullRequests.prUpdatedAt))
            .limit(limit)
            .offset(offset),
          db.select({ count: drizzleOrm.count() }).from(githubPullRequests),
        ]);

        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        reply.send({
          data: pullRequests,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/pull-requests" }, "Failed to fetch pull requests from DB.");
        reply.status(500).send({ error: "Failed to fetch pull requests from database." });
      }
    },
  );

  // Refresh endpoint
  fastify.post("/refresh", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const repositories = await githubService.getRepositories();
      await githubService.connector.store.save(repositories);

      const pullRequests = await githubService.getPullRequests();
      await githubService.connector.store.save(pullRequests);

      reply.send({
        success: true,
        message: "GitHub data refreshed successfully",
        counts: {
          repositories: repositories.length,
          pullRequests: pullRequests.length,
        },
      });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/refresh" }, "Failed to refresh GitHub data.");
      reply.status(500).send({ error: "Failed to refresh GitHub data." });
    }
  });
}
