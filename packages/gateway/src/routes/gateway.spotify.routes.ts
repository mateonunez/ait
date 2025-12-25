import { type ConnectorSpotifyService, clearOAuthData, connectorServiceFactory } from "@ait/connectors";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    spotifyService: ConnectorSpotifyService;
  }
}

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
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

        // Data fetching is now handled separately via the /refresh endpoint or background jobs
        // to avoid timeout issues during the auth callback.

        reply.send({
          success: true,
          message: "Authentication successful. You can close this window.",
        });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  // Disconnect endpoint - revokes and removes OAuth token
  fastify.post("/auth/disconnect", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await clearOAuthData(connectorType);
      reply.send({ success: true, message: "Spotify disconnected successfully." });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/auth/disconnect" }, "Failed to disconnect Spotify.");
      reply.status(500).send({ error: "Failed to disconnect Spotify." });
    }
  });

  // Paginated data routes
  fastify.get(
    "/data/tracks",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await spotifyService.getTracksPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/tracks" }, "Failed to fetch tracks from DB.");
        reply.status(500).send({ error: "Failed to fetch tracks from database." });
      }
    },
  );

  fastify.get(
    "/data/artists",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await spotifyService.getArtistsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/artists" }, "Failed to fetch artists from DB.");
        reply.status(500).send({ error: "Failed to fetch artists from database." });
      }
    },
  );

  fastify.get(
    "/data/playlists",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await spotifyService.getPlaylistsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/playlists" }, "Failed to fetch playlists from DB.");
        reply.status(500).send({ error: "Failed to fetch playlists from database." });
      }
    },
  );

  fastify.get(
    "/data/albums",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await spotifyService.getAlbumsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/albums" }, "Failed to fetch albums from DB.");
        reply.status(500).send({ error: "Failed to fetch albums from database." });
      }
    },
  );

  fastify.get(
    "/data/recently-played",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await spotifyService.getRecentlyPlayedPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/recently-played" }, "Failed to fetch recently played from DB.");
        reply.status(500).send({ error: "Failed to fetch recently played from database." });
      }
    },
  );

  // Refresh endpoint with optional entity filter
  // Usage: POST /refresh?entities=tracks,artists or POST /refresh (all entities)
  fastify.post(
    "/refresh",
    async (request: FastifyRequest<{ Querystring: { entities?: string } }>, reply: FastifyReply) => {
      try {
        const { entities: entitiesParam } = request.query;
        const entitiesToRefresh = entitiesParam
          ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
          : ["tracks", "artists", "playlists", "albums", "recently-played"];

        const counts: Record<string, number> = {};

        if (entitiesToRefresh.includes("tracks")) {
          const tracks = await spotifyService.fetchTracks();
          await spotifyService.connector.store.save(tracks);
          counts.tracks = tracks.length;
        }

        if (entitiesToRefresh.includes("artists")) {
          const artists = await spotifyService.fetchArtists();
          await spotifyService.connector.store.save(artists);
          counts.artists = artists.length;
        }

        if (entitiesToRefresh.includes("playlists")) {
          const playlists = await spotifyService.fetchPlaylists();
          await spotifyService.connector.store.save(playlists);
          counts.playlists = playlists.length;
        }

        if (entitiesToRefresh.includes("albums")) {
          const albums = await spotifyService.fetchAlbums();
          await spotifyService.connector.store.save(albums);
          counts.albums = albums.length;
        }

        if (entitiesToRefresh.includes("recently-played") || entitiesToRefresh.includes("recentlyplayed")) {
          const recentlyPlayed = await spotifyService.fetchRecentlyPlayed();
          await spotifyService.connector.store.save(recentlyPlayed);
          counts.recentlyPlayed = recentlyPlayed.length;
        }

        reply.send({
          success: true,
          message: "Spotify data refreshed successfully",
          counts,
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/refresh" }, "Failed to refresh Spotify data.");
        reply.status(500).send({ error: "Failed to refresh Spotify data." });
      }
    },
  );
}
