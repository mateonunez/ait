import {
  type ConnectorSpotifyService,
  SPOTIFY_ENTITY_TYPES_ENUM,
  clearOAuthData,
  connectorServiceFactory,
} from "@ait/connectors";
import { type SpotifyEntityType, getLogger } from "@ait/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AuthQuery, OAuthCallbackQuery, PaginationQuery } from "../types/route.types";

const logger = getLogger();

const connectorType = "spotify";

export default async function spotifyRoutes(fastify: FastifyInstance) {
  const getService = async (
    request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>,
    configId?: string,
  ): Promise<ConnectorSpotifyService> => {
    const query = request.query;
    let userId = (request.headers["x-user-id"] || query.userId) as string | undefined;

    // Support extracting userId from OAuth state if it's encoded there
    const state = query.state;
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

  fastify.get("/auth", async (request: FastifyRequest<{ Querystring: AuthQuery }>, reply: FastifyReply) => {
    try {
      const { configId, userId: queryUserId } = request.query;
      if (!configId) return reply.status(400).send({ error: "Missing configId" });

      const service = await getService(request as FastifyRequest<{ Querystring: OAuthCallbackQuery }>, configId);
      const userId = (request.headers["x-user-id"] || queryUserId) as string;
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
    async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
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

        // Helper for progressive paginated fetching - saves each batch immediately
        const fetchAndStoreProgressively = async (
          entityType: string,
          generator: AsyncGenerator<unknown[], void, unknown>,
        ): Promise<number> => {
          let count = 0;
          try {
            for await (const batch of generator) {
              await service.connector.store.save(batch as SpotifyEntityType[]);
              count += batch.length;
            }
          } catch (error) {
            logger.warn(`${entityType} refresh stopped after ${count} items`, { error });
          }
          return count;
        };

        if (entitiesToRefresh.includes("tracks")) {
          counts.tracks = await fetchAndStoreProgressively(
            "tracks",
            service.fetchEntitiesPaginated(SPOTIFY_ENTITY_TYPES_ENUM.TRACK, true, true),
          );
        }

        if (entitiesToRefresh.includes("artists")) {
          counts.artists = await fetchAndStoreProgressively(
            "artists",
            service.fetchEntitiesPaginated(SPOTIFY_ENTITY_TYPES_ENUM.ARTIST, true, true),
          );
        }

        if (entitiesToRefresh.includes("playlists")) {
          counts.playlists = await fetchAndStoreProgressively(
            "playlists",
            service.fetchEntitiesPaginated(SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST, true, true),
          );
        }

        if (entitiesToRefresh.includes("albums")) {
          counts.albums = await fetchAndStoreProgressively(
            "albums",
            service.fetchEntitiesPaginated(SPOTIFY_ENTITY_TYPES_ENUM.ALBUM, true, true),
          );
        }

        if (entitiesToRefresh.includes("recently-played") || entitiesToRefresh.includes("recentlyplayed")) {
          counts.recentlyPlayed = await fetchAndStoreProgressively(
            "recently-played",
            service.fetchEntitiesPaginated(SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED, true, true),
          );
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
