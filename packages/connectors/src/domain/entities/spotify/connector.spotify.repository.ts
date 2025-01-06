import { getPostgresClient, type OAuthTokenDataTarget, spotifyTracks } from "@ait/postgres";
import { connectorSpotifyTrackMapper } from "../../mappers/spotify/connector.spotify.mapper";
import type { SpotifyTrackEntity } from "./connector.spotify.entities";
import type {
  IConnectorSpotifyRepository,
  IConnectorSpotifyTrackRepository,
} from "./connector.spotify.repository.interface";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth.interface";
import { getOAuthData, saveOAuthData } from "../../../shared/auth/lib/oauth/connector.oauth.utils";

const _pgClient = getPostgresClient();

export class ConnectorSpotifyTrackRepository implements IConnectorSpotifyTrackRepository {
  private _pgClient = getPostgresClient();

  async saveTrack(track: SpotifyTrackEntity): Promise<void> {
    if (!track?.id) {
      throw new Error("Invalid track: missing track ID");
    }

    try {
      const tracks = connectorSpotifyTrackMapper.domainToDataTarget(track);

      await this._pgClient.db.transaction(async (tx) => {
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
  private _spotifyTrackRepository: ConnectorSpotifyTrackRepository;

  constructor() {
    super();
    this._spotifyTrackRepository = new ConnectorSpotifyTrackRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    saveOAuthData(data, "spotify");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("spotify");
  }

  get track(): ConnectorSpotifyTrackRepository {
    return this._spotifyTrackRepository;
  }

  set track(trackRepository: ConnectorSpotifyTrackRepository) {
    this._spotifyTrackRepository = trackRepository;
  }
}
