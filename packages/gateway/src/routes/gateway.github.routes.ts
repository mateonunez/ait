import { type ConnectorGitHubService, connectorServiceFactory } from "@ait/connectors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    githubService: ConnectorGitHubService;
  }
}

interface AuthCallbackQuery {
  code: string;
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

        reply.send({
          repositories,
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
}
