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

export default async function spotifyRoutes(fastify: FastifyInstance) {
  if (!fastify.spotifyService) {
    fastify.decorate("spotifyService", connectorServiceFactory.getService<ConnectorSpotifyService>(connectorType));
  }

  const spotifyService = fastify.spotifyService;

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery }>, reply: FastifyReply) => {
      const { code } = request.query;

      if (!code) {
        fastify.log.error({ route: "/auth/callback" }, "Missing authorization code.");
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        await spotifyService.connector.connect(code);

        const tracks = await spotifyService.getTracks();
        await spotifyService.connector.store.save(tracks);

        const artists = await spotifyService.getArtists();
        await spotifyService.connector.store.save(artists);

        reply.send({
          tracks,
          artists,
        });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  fastify.get("/tracks", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tracks = await spotifyService.getTracks();
      reply.send(tracks);
    } catch (err: any) {
      fastify.log.error({ err, route: "/tracks" }, "Failed to fetch tracks.");
      reply.status(500).send({ error: "Failed to fetch tracks." });
    }
  });

  fastify.get("/artists", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const artists = await spotifyService.getArtists();
      reply.send(artists);
    } catch (err: any) {
      fastify.log.error({ err, route: "/artists" }, "Failed to fetch artists.");
      reply.status(500).send({ error: "Failed to fetch artists." });
    }
  });
}
