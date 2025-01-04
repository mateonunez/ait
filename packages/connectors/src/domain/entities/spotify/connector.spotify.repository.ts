import { db } from "../../../infrastructure/db/db.client";
import { spotifyTracks } from "../../../infrastructure/db/schemas/connector.spotify.schema";
import { connectorSpotifyTrackMapper } from "../../mappers/spotify/connector.spotify.mapper";
import type { SpotifyTrackEntity } from "./connector.spotify.entities";
import type { SpotifyTrackDataTarget } from "../../../infrastructure/db/schemas/connector.spotify.schema";
import type {
  IConnectorSpotifyRepository,
  IConnectorSpotifyTrackRepository,
} from "./connector.spotify.repository.interface";

export class ConnectorSpotifyTrackRepository implements IConnectorSpotifyTrackRepository {
  async saveTrack(track: SpotifyTrackEntity): Promise<void> {
    if (!track?.id) {
      throw new Error("Invalid track: missing track ID");
    }

    try {
      const tracks = connectorSpotifyTrackMapper.domainToDataTarget(track);

      await db.transaction(async (tx) => {
        await tx.insert(spotifyTracks).values(tracks).onConflictDoNothing().execute();
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
      await Promise.all(tracks.map((track) => this.saveTrack(track)));
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

export class ConnectorSpotifyRepository extends ConnectorSpotifyTrackRepository implements IConnectorSpotifyRepository {
  private _spotifyTrackRepository: IConnectorSpotifyTrackRepository;

  constructor() {
    super();
    this._spotifyTrackRepository = new ConnectorSpotifyTrackRepository();
  }

  get trackRepository(): ConnectorSpotifyTrackRepository {
    return this._spotifyTrackRepository;
  }

  set trackRepository(trackRepository: ConnectorSpotifyTrackRepository) {
    this._spotifyTrackRepository = trackRepository;
  }
}
