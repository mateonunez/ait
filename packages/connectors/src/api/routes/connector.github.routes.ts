import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ConnectorGitHubService } from "../../services/github/connector.github.service";
import type { NormalizedGitHubRepository } from "../../infrastructure/github/normalizer/connector.github.normalizer.interface";

interface AuthCallbackQuery {
  code: string;
}

export default async function githubRoutes(fastify: FastifyInstance) {
  const githubService = new ConnectorGitHubService();

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery }>, reply: FastifyReply) => {
      const { code } = request.query;
      if (!code) {
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        await githubService.authenticate(code);

        const repositories = await githubService.getRepositories();
        await githubService.connector.store.save<NormalizedGitHubRepository[]>(repositories);

        reply.send(repositories);
      } catch (err: any) {
        fastify.log.error(err);
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  // TODO: not implemented yet
  fastify.get("/repositories", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const repositories = await githubService.getRepositories();
      await githubService.connector.store.save<NormalizedGitHubRepository[]>(repositories);
      reply.send(repositories);
    } catch (err: any) {
      fastify.log.error(err);
      reply.status(500).send({ error: "Failed to fetch repositories." });
    }
  });
}
