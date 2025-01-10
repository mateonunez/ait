import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ConnectorGitHubService } from "../../services/github/connector.github.service";

interface AuthCallbackQuery {
  code: string;
}

const defaultProvider = "github";

export default async function spotifyRoutes(fastify: FastifyInstance) {
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
        await githubService.connector.store.save(repositories);

        reply.send(repositories);
      } catch (err: any) {
        fastify.log.error(err);
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.get("/repositories", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const repositories = await githubService.getRepositories();
      reply.send(repositories);
    } catch (err: any) {
      fastify.log.error(err);
      reply.status(500).send({ error: "Failed to fetch repositories." });
    }
  });
}
