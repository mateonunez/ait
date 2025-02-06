import { getPostgresClient, type OAuthTokenDataTarget, spotifyTracks } from "@ait/postgres";
import { connectorSpotifyTrackMapper } from "../../mappers/vendors/connector.spotify.mapper";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import { getOAuthData, saveOAuthData } from "@/shared/auth/lib/oauth/connector.oauth.utils";
import { randomUUID } from "node:crypto";
import type {
  IConnectorSpotifyTrackRepository,
  SpotifyTrackEntity,
  IConnectorSpotifyTrackRepositoryOptions,
  IConnectorSpotifyRepository,
} from "@/types/domain/entities/vendors/connector.spotify.repository.types";

/**
 * Base interface for all Spotify entities
 */
export class ConnectorSpotifyTrackRepository implements IConnectorSpotifyTrackRepository {
  private _pgClient = getPostgresClient();

  async saveTrack(
    track: SpotifyTrackEntity,
    options: IConnectorSpotifyTrackRepositoryOptions = { incremental: false },
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
      for (const track of tracks) {
        await this.saveTrack(track);
      }
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

/**
 * Connector for Spotify Repository: tracks, albums, artists, playlists, etc
 */
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
