import { connectorServiceFactory, type ConnectorSpotifyService } from "@ait/connectors";
import {
  getPostgresClient,
  spotifyTracks,
  spotifyArtists,
  spotifyPlaylists,
  spotifyAlbums,
  spotifyRecentlyPlayed,
  drizzleOrm,
} from "@ait/postgres";
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

        const tracks = await spotifyService.getTracks();
        await spotifyService.connector.store.save(tracks);

        const artists = await spotifyService.getArtists();
        await spotifyService.connector.store.save(artists);

        const playlists = await spotifyService.getPlaylists();
        await spotifyService.connector.store.save(playlists);

        const albums = await spotifyService.getAlbums();
        await spotifyService.connector.store.save(albums);

        const recentlyPlayed = await spotifyService.getRecentlyPlayed();
        await spotifyService.connector.store.save(recentlyPlayed);

        reply.send({
          tracks,
          artists,
          playlists,
          albums,
          recentlyPlayed,
        });
      } catch (err: any) {
        fastify.log.error({ err, route: "/auth/callback" }, "Authentication failed.");
        reply.status(500).send({ error: "Authentication failed." });
      }
    },
  );

  // Paginated data routes
  fastify.get(
    "/data/tracks",
    async (request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) => {
      try {
        const page = Number.parseInt(request.query.page || "1", 10);
        const limit = Number.parseInt(request.query.limit || "50", 10);
        const offset = (page - 1) * limit;

        const { db } = getPostgresClient();

        const [tracks, totalResult] = await Promise.all([
          db.select().from(spotifyTracks).orderBy(drizzleOrm.desc(spotifyTracks.addedAt)).limit(limit).offset(offset),
          db.select({ count: drizzleOrm.count() }).from(spotifyTracks),
        ]);

        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        reply.send({
          data: tracks,
          pagination: { page, limit, total, totalPages },
        });
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
        const offset = (page - 1) * limit;

        const { db } = getPostgresClient();

        const [artists, totalResult] = await Promise.all([
          db
            .select()
            .from(spotifyArtists)
            .orderBy(drizzleOrm.desc(spotifyArtists.createdAt))
            .limit(limit)
            .offset(offset),
          db.select({ count: drizzleOrm.count() }).from(spotifyArtists),
        ]);

        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        reply.send({
          data: artists,
          pagination: { page, limit, total, totalPages },
        });
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
        const offset = (page - 1) * limit;

        const { db } = getPostgresClient();

        const [playlists, totalResult] = await Promise.all([
          db
            .select()
            .from(spotifyPlaylists)
            .orderBy(drizzleOrm.desc(spotifyPlaylists.updatedAt))
            .limit(limit)
            .offset(offset),
          db.select({ count: drizzleOrm.count() }).from(spotifyPlaylists),
        ]);

        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        reply.send({
          data: playlists,
          pagination: { page, limit, total, totalPages },
        });
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
        const offset = (page - 1) * limit;

        const { db } = getPostgresClient();

        const [albums, totalResult] = await Promise.all([
          db.select().from(spotifyAlbums).orderBy(drizzleOrm.desc(spotifyAlbums.createdAt)).limit(limit).offset(offset),
          db.select({ count: drizzleOrm.count() }).from(spotifyAlbums),
        ]);

        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        reply.send({
          data: albums,
          pagination: { page, limit, total, totalPages },
        });
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
        const offset = (page - 1) * limit;

        const { db } = getPostgresClient();

        const [recentlyPlayed, totalResult] = await Promise.all([
          db
            .select()
            .from(spotifyRecentlyPlayed)
            .orderBy(drizzleOrm.desc(spotifyRecentlyPlayed.playedAt))
            .limit(limit)
            .offset(offset),
          db.select({ count: drizzleOrm.count() }).from(spotifyRecentlyPlayed),
        ]);

        const total = totalResult[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        reply.send({
          data: recentlyPlayed,
          pagination: { page, limit, total, totalPages },
        });
      } catch (err: unknown) {
        fastify.log.error({ err, route: "/data/recently-played" }, "Failed to fetch recently played from DB.");
        reply.status(500).send({ error: "Failed to fetch recently played from database." });
      }
    },
  );

  // Refresh endpoint
  fastify.post("/refresh", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [tracks, artists, playlists, albums, recentlyPlayed] = await Promise.all([
        spotifyService.getTracks(),
        spotifyService.getArtists(),
        spotifyService.getPlaylists(),
        spotifyService.getAlbums(),
        spotifyService.getRecentlyPlayed(),
      ]);

      await Promise.all([
        spotifyService.connector.store.save(tracks),
        spotifyService.connector.store.save(artists),
        spotifyService.connector.store.save(playlists),
        spotifyService.connector.store.save(albums),
        spotifyService.connector.store.save(recentlyPlayed),
      ]);

      reply.send({
        success: true,
        message: "Spotify data refreshed successfully",
        counts: {
          tracks: tracks.length,
          artists: artists.length,
          playlists: playlists.length,
          albums: albums.length,
          recentlyPlayed: recentlyPlayed.length,
        },
      });
    } catch (err: unknown) {
      fastify.log.error({ err, route: "/refresh" }, "Failed to refresh Spotify data.");
      reply.status(500).send({ error: "Failed to refresh Spotify data." });
    }
  });
}
