import type { getPostgresClient } from "../../postgres.client";
import { spotifyTracks, spotifyRecentlyPlayed } from "../../schemas/connector.spotify.schema";
import { desc } from "drizzle-orm";

export function getSpotifyTracksQuery(
  _postgresClient: ReturnType<typeof getPostgresClient>,
  options?: { limit?: number },
) {
  const { db } = _postgresClient;
  return db
    .select({
      id: spotifyTracks.id,
      name: spotifyTracks.name,
      artist: spotifyTracks.artist,
      album: spotifyTracks.album,
      durationMs: spotifyTracks.durationMs,
      popularity: spotifyTracks.popularity,
      createdAt: spotifyTracks.createdAt,
      updatedAt: spotifyTracks.updatedAt,
    })
    .from(spotifyTracks)
    .limit(options?.limit ?? 100)
    .execute();
}

export function getSpotifyRecentlyPlayedQuery(
  _postgresClient: ReturnType<typeof getPostgresClient>,
  options?: { limit?: number },
) {
  const { db } = _postgresClient;
  return db
    .select()
    .from(spotifyRecentlyPlayed)
    .orderBy(desc(spotifyRecentlyPlayed.playedAt))
    .limit(options?.limit ?? 100)
    .execute();
}
