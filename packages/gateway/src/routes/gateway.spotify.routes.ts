import { type ConnectorSpotifyService, clearOAuthData, connectorServiceFactory } from "@ait/connectors";
import { getLogger } from "@ait/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const logger = getLogger();

interface AuthCallbackQuery {
  code: string;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

const connectorType = "spotify";

export default async function spotifyRoutes(fastify: FastifyInstance) {
  const getService = async (request: FastifyRequest, configId?: string): Promise<ConnectorSpotifyService> => {
    let userId = (request.headers["x-user-id"] || (request.query as any).userId) as string | undefined;

    // Support extracting userId from OAuth state if it's encoded there
    const state = (request.query as any).state;
    if (!userId && state && typeof state === "string" && state.includes(":")) {
      userId = state.split(":")[1];
    }

    const currentUserId = userId || "anonymous";

    if (configId) {
      return await connectorServiceFactory.getServiceByConfig<ConnectorSpotifyService>(configId, currentUserId);
    }

    // Fallback/Legacy
    return connectorServiceFactory.getService<ConnectorSpotifyService>(connectorType);
  };

  fastify.get("/auth", async (request: FastifyRequest<{ Querystring: { configId: string } }>, reply: FastifyReply) => {
    try {
      const { configId } = request.query;
      if (!configId) return reply.status(400).send({ error: "Missing configId" });

      const service = await getService(request, configId);
      const userId = (request.headers["x-user-id"] || (request.query as any).userId) as string;
      const config = service.connector.authenticator.getOAuthConfig();

      const params = new URLSearchParams({
        client_id: config.clientId,
        response_type: "code",
        redirect_uri: config.redirectUri!,
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
        state: `${configId}:${userId}`,
      });

      const authUrl = `https://accounts.spotify.com/authorize?${params}`;
      reply.redirect(authUrl);
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/auth" }, "Failed to initiate Spotify authentication.");
      reply.status(500).send({ error: "Failed to initiate Spotify authentication." });
    }
  });

  fastify.get(
    "/auth/callback",
    async (request: FastifyRequest<{ Querystring: AuthCallbackQuery & { state?: string } }>, reply: FastifyReply) => {
      const { code, state } = request.query;
      const [configId] = (state || "").split(":");

      if (!code) {
        fastify.log.error({ route: "/auth/callback" }, "Missing authorization code.");
        return reply.status(400).send({ error: "Missing authorization code." });
      }

      try {
        const service = await getService(request, configId);
        await service.connector.connect(code);

        reply.send({
          success: true,
          message: "Authentication successful. You can close this window.",
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  // Disconnect endpoint - revokes and removes OAuth token
  fastify.post(
    "/auth/disconnect",
    async (request: FastifyRequest<{ Querystring: { configId?: string } }>, reply: FastifyReply) => {
      try {
        const userId = request.headers["x-user-id"] as string;
        await clearOAuthData(connectorType, userId);
        reply.send({ success: true, message: "Spotify disconnected successfully." });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/auth/disconnect" }, "Failed to disconnect Spotify.");
        reply.status(500).send({ error: "Failed to disconnect Spotify." });
      }
    },
  );

  // Paginated data routes
  fastify.get(
    "/data/tracks",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getTracksPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/tracks" }, "Failed to fetch tracks from DB.");
        reply.status(500).send({ error: "Failed to fetch tracks from database." });
      }
    },
  );

  fastify.get(
    "/data/artists",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getArtistsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/artists" }, "Failed to fetch artists from DB.");
        reply.status(500).send({ error: "Failed to fetch artists from database." });
      }
    },
  );

  fastify.get(
    "/data/playlists",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getPlaylistsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/playlists" }, "Failed to fetch playlists from DB.");
        reply.status(500).send({ error: "Failed to fetch playlists from database." });
      }
    },
  );

  fastify.get(
    "/data/albums",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getAlbumsPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/albums" }, "Failed to fetch albums from DB.");
        reply.status(500).send({ error: "Failed to fetch albums from database." });
      }
    },
  );

  fastify.get(
    "/data/recently-played",
    async (request: FastifyRequest<{ Querystring: PaginationQuery & { configId?: string } }>, reply: FastifyReply) => {
      try {
        const { configId } = request.query;
        const service = await getService(request, configId);
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);

        const result = await service.getRecentlyPlayedPaginated({ page, limit });
        reply.send(result);
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/recently-played" }, "Failed to fetch recently played from DB.");
        reply.status(500).send({ error: "Failed to fetch recently played from database." });
      }
    },
  );

  // Refresh endpoint with optional entity filter
  fastify.post(
    "/refresh",
    async (request: FastifyRequest<{ Querystring: { entities?: string; configId?: string } }>, reply: FastifyReply) => {
      try {
        const { entities: entitiesParam, configId } = request.query;
        const service = await getService(request, configId);

        const entitiesToRefresh = entitiesParam
          ? entitiesParam.split(",").map((e) => e.trim().toLowerCase())
          : ["tracks", "artists", "playlists", "albums", "recently-played"];

        const counts: Record<string, number> = {};

        if (entitiesToRefresh.includes("tracks")) {
          const tracks = await service.fetchTracks();
          await service.connector.store.save(tracks);
          counts.tracks = tracks.length;
        }

        if (entitiesToRefresh.includes("artists")) {
          const artists = await service.fetchArtists();
          await service.connector.store.save(artists);
          counts.artists = artists.length;
        }

        if (entitiesToRefresh.includes("playlists")) {
          const playlists = await service.fetchPlaylists();
          await service.connector.store.save(playlists);
          counts.playlists = playlists.length;
        }

        if (entitiesToRefresh.includes("albums")) {
          const albums = await service.fetchAlbums();
          await service.connector.store.save(albums);
          counts.albums = albums.length;
        }

        if (entitiesToRefresh.includes("recently-played") || entitiesToRefresh.includes("recentlyplayed")) {
          const recentlyPlayed = await service.fetchRecentlyPlayed();
          await service.connector.store.save(recentlyPlayed);
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
