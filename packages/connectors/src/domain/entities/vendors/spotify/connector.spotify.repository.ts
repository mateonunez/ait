import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import { getOAuthData, saveOAuthData } from "@/shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorSpotifyRepository } from "@/types/domain/entities/vendors/connector.spotify.types";
import { ConnectorSpotifyTrackRepository } from "./connector.spotify-track.repository";
import { ConnectorSpotifyArtistRepository } from "./connector.spotify-artist.repository";
import { ConnectorSpotifyPlaylistRepository } from "./connector.spotify-playlist.repository";
import { ConnectorSpotifyAlbumRepository } from "./connector.spotify-album.repository";

// TODO: implement a generic repository for all connector repositories
export class ConnectorSpotifyRepository extends ConnectorSpotifyTrackRepository implements IConnectorSpotifyRepository {
  private _spotifyTrackRepository: ConnectorSpotifyTrackRepository;
  private _spotifyArtistRepository: ConnectorSpotifyArtistRepository;
  private _spotifyPlaylistRepository: ConnectorSpotifyPlaylistRepository;
  private _spotifyAlbumRepository: ConnectorSpotifyAlbumRepository;

  constructor() {
    super();
    this._spotifyTrackRepository = new ConnectorSpotifyTrackRepository();
    this._spotifyArtistRepository = new ConnectorSpotifyArtistRepository();
    this._spotifyPlaylistRepository = new ConnectorSpotifyPlaylistRepository();
    this._spotifyAlbumRepository = new ConnectorSpotifyAlbumRepository();
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

  get playlist(): ConnectorSpotifyPlaylistRepository {
    return this._spotifyPlaylistRepository;
  }

  set playlist(playlistRepository: ConnectorSpotifyPlaylistRepository) {
    this._spotifyPlaylistRepository = playlistRepository;
  }

  get album(): ConnectorSpotifyAlbumRepository {
    return this._spotifyAlbumRepository;
  }

  set album(albumRepository: ConnectorSpotifyAlbumRepository) {
    this._spotifyAlbumRepository = albumRepository;
  }
}
