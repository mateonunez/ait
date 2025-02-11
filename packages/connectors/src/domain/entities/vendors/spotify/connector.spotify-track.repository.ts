import { connectorSpotifyTrackMapper } from "@/domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "@/types/domain/entities/connector.repository.interface";
import type {
  IConnectorSpotifyTrackRepository,
  SpotifyTrackEntity,
} from "@/types/domain/entities/vendors/connector.spotify.types";
import { getPostgresClient, spotifyTracks } from "@ait/postgres";
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
        await tx.insert(spotifyTracks).values(trackDataTarget).onConflictDoNothing().execute();
      });

      console.debug("Track saved successfully:", { trackId: track.id });
    } catch (error: any) {
      console.error("Failed to save track:", { trackId: track.id, error });
      throw new Error(`Failed to save track ${track.id}: ${error.message}`);
    }
  }

  async saveTracks(tracks: SpotifyTrackEntity[]): Promise<void> {
    if (!tracks.length) {
      return;
    }

    try {
      console.debug("Saving tracks to Spotify repository:", { tracks });

      for (const track of tracks) {
        await this.saveTrack(track, { incremental: true });
      }

      console.debug("Tracks saved successfully:", { tracks: tracks.length });
    } catch (error) {
      console.error("Error saving tracks:", error);
      throw new Error("Failed to save tracks to repository");
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
