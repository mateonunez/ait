import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import { getOAuthData, saveOAuthData } from "@/shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorSpotifyRepository } from "@/types/domain/entities/vendors/connector.spotify.repository.types";
import { ConnectorSpotifyTrackRepository } from "./connector.spotify-track.repository";
import { ConnectorSpotifyArtistRepository } from "./connector.spotify-artist.repository";

/**
 * Connector for Spotify Repository: tracks, albums, artists, playlists, etc
 */
export class ConnectorSpotifyRepository extends ConnectorSpotifyTrackRepository implements IConnectorSpotifyRepository {
  private _spotifyTrackRepository: ConnectorSpotifyTrackRepository;
  private _spotifyArtistRepository: ConnectorSpotifyArtistRepository;

  constructor() {
    super();
    this._spotifyTrackRepository = new ConnectorSpotifyTrackRepository();
    this._spotifyArtistRepository = new ConnectorSpotifyArtistRepository();
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

  get artist(): ConnectorSpotifyArtistRepository {
    return this._spotifyArtistRepository;
  }

  set artist(artistRepository: ConnectorSpotifyArtistRepository) {
    this._spotifyArtistRepository = artistRepository;
  }
}
