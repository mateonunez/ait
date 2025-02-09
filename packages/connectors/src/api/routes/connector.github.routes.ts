import { connectorServiceFactory } from "@/services/connector.service.factory";
import type { ConnectorGitHubService } from "@/services/vendors/connector.github.service";
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
