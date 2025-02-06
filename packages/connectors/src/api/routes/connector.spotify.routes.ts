import { connectorServiceFactory } from "@/services/connector.service.factory";
import type { ConnectorSpotifyService } from "@/services/vendors/connector.spotify.service";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    spotifyService: ConnectorSpotifyService;
  }
}

interface AuthCallbackQuery {
  code: string;
}

const connectorType = "spotify";

export default async function githubRoutes(fastify: FastifyInstance) {
  const spotifyService = fastify.spotifyService;
  if (!spotifyService) {
    fastify.decorate("spotifyService", connectorServiceFactory.getService<ConnectorSpotifyService>(connectorType));
  }

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery }>, reply: FastifyReply) => {
      const { code } = request.query;
      if (!code) {
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        await spotifyService.connector.authenticator.authenticate(code);

        const tracks = await spotifyService.getTracks();
        await spotifyService.connector.store.save(tracks);

        reply.send(tracks);
      } catch (err: any) {
        fastify.log.error(err);
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.get("/tracks", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tracks = await spotifyService.getTracks();
      reply.send(tracks);
    } catch (err: any) {
      fastify.log.error(err);
      reply.status(500).send({ error: "Failed to fetch tracks." });
    }
  });
}
