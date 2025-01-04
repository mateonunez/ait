import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ConnectorSpotifyService } from "../../services/spotify/connector.spotify.service";
import type { NormalizedSpotifyTrack } from "../../infrastructure/spotify/normalizer/connector.spotify.normalizer.interface";

interface AuthCallbackQuery {
  code: string;
}

export default async function githubRoutes(fastify: FastifyInstance) {
  const spotifyService = new ConnectorSpotifyService();

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery }>, reply: FastifyReply) => {
      const { code } = request.query;
      if (!code) {
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        await spotifyService.authenticate(code);

        const tracks = await spotifyService.getTracks();
        await spotifyService.connector.store.save<NormalizedSpotifyTrack[]>(tracks);

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
