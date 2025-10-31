import { AItError } from "@ait/core";
import { connectorSpotifyTrackMapper } from "../../../../domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type {
  IConnectorSpotifyTrackRepository,
  SpotifyTrackEntity,
} from "../../../../types/domain/entities/vendors/connector.spotify.types";
import { getPostgresClient, spotifyTracks, type SpotifyTrackDataTarget } from "@ait/postgres";
import { randomUUID } from "node:crypto";

export class ConnectorSpotifyTrackRepository implements IConnectorSpotifyTrackRepository {
  private _pgClient = getPostgresClient();

  async saveTrack(
    track: SpotifyTrackEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const trackId = incremental ? randomUUID() : track.id;

    try {
      const trackDataTarget = connectorSpotifyTrackMapper.domainToDataTarget(track);
      trackDataTarget.id = trackId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<SpotifyTrackDataTarget> = {
          name: trackDataTarget.name,
          artist: trackDataTarget.artist,
          album: trackDataTarget.album,
          durationMs: trackDataTarget.durationMs,
          explicit: trackDataTarget.explicit,
          isPlayable: trackDataTarget.isPlayable,
          previewUrl: trackDataTarget.previewUrl,
          trackNumber: trackDataTarget.trackNumber,
          discNumber: trackDataTarget.discNumber,
          uri: trackDataTarget.uri,
          href: trackDataTarget.href,
          isLocal: trackDataTarget.isLocal,
          popularity: trackDataTarget.popularity,
          albumData: trackDataTarget.albumData,
          artistsData: trackDataTarget.artistsData,
          externalIds: trackDataTarget.externalIds,
          externalUrls: trackDataTarget.externalUrls,
          addedAt: trackDataTarget.addedAt,
          updatedAt: trackDataTarget.updatedAt ?? new Date(),
        };

        if (trackDataTarget.createdAt) {
          updateValues.createdAt = trackDataTarget.createdAt;
        }

        await tx
          .insert(spotifyTracks)
          .values(trackDataTarget)
          .onConflictDoUpdate({
            target: spotifyTracks.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      console.error("Failed to save track:", { trackId: track.id, error });
      throw new AItError(
        "SPOTIFY_SAVE_TRACK",
        `Failed to save track ${track.id}: ${error.message}`,
        { id: track.id },
        error,
      );
    }
  }

  async saveTracks(tracks: SpotifyTrackEntity[]): Promise<void> {
    if (!tracks.length) {
      return;
    }

    try {
      console.debug("Saving tracks to Spotify repository:", { tracks });

      for (const track of tracks) {
        await this.saveTrack(track, { incremental: false });
      }
    } catch (error) {
      console.error("Error saving tracks:", error);
      throw new AItError("SPOTIFY_SAVE_TRACK_BULK", "Failed to save tracks to repository");
    }
  }

  async getTrack(id: string): Promise<SpotifyTrackEntity | null> {
    console.log("Getting track from Spotify repository", id);
    return null;
  }

  async getTracks(): Promise<SpotifyTrackEntity[]> {
    console.log("Getting tracks from Spotify repository");
    return [];
  }
}
