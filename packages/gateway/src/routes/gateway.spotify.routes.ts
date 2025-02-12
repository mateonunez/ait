import { connectorServiceFactory, type ConnectorSpotifyService } from "@ait/connectors";
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

  fastify.get("/auth", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = new URLSearchParams({
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        response_type: "code",
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
        scope: [
          "playlist-read-private",
          "playlist-read-collaborative",
          "user-read-playback-state",
          "user-read-currently-playing",
          "user-read-recently-played",
          "user-read-playback-position",
          "user-top-read",
          "user-library-read",
        ].join(" "),
      });

      const authUrl = `${process.env.SPOTIFY_AUTH_URL}?${params}`;
      reply.redirect(authUrl);
    } catch (err: any) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate Spotify authentication.");
      reply.status(500).send({ error: "Failed to initiate Spotify authentication." });
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
        await spotifyService.connector.connect(code);

        const tracks = await spotifyService.getTracks();
        await spotifyService.connector.store.save(tracks);

        const artists = await spotifyService.getArtists();
        await spotifyService.connector.store.save(artists);

        const playlists = await spotifyService.getPlaylists();
        await spotifyService.connector.store.save(playlists);

        const albums = await spotifyService.getAlbums();
        await spotifyService.connector.store.save(albums);

        reply.send({
          tracks,
          artists,
          playlists,
          albums,
        });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  // Rest of the routes remain the same...
}
