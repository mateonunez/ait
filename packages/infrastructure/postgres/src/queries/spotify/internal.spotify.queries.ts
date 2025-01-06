import type { getPostgresClient } from "../../postgres.client";
import { spotifyTracks } from "../../schemas/connector.spotify.schema";

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
