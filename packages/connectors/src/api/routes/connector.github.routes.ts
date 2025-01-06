import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ConnectorGitHubService } from "../../services/github/connector.github.service";

interface AuthCallbackQuery {
  code: string;
}

export default async function githubRoutes(fastify: FastifyInstance) {
  const githubService = new ConnectorGitHubService();

  // TODO: not implemented yet
  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery }>, reply: FastifyReply) => {
      const { code } = request.query;
      if (!code) {
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        await githubService.authenticate(code);

        reply.send({ message: "Authenticated successfully." });
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
