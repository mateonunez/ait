import type { SpotifyEntity } from "@/types/domain/entities/vendors/connector.spotify.types";
import type { IConnectorSpotifyRepository } from "@/types/domain/entities/vendors/connector.spotify.types";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import type { IConnectorStore } from "@/types/shared/store/connector.store.interface";
import { SPOTIFY_ENTITY_TYPES_ENUM } from "@/services/vendors/connector.vendors.config";

export class ConnectorSpotifyStore implements IConnectorStore {
  private _connectorSpotifyRepository: IConnectorSpotifyRepository;

  constructor(connectorSpotifyRepository: IConnectorSpotifyRepository) {
    this._connectorSpotifyRepository = connectorSpotifyRepository;
  }

  async save<T extends SpotifyEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.__type) {
        case SPOTIFY_ENTITY_TYPES_ENUM.TRACK:
          await this._connectorSpotifyRepository.track.saveTrack(item, { incremental: false });
          break;
        case SPOTIFY_ENTITY_TYPES_ENUM.ARTIST:
          await this._connectorSpotifyRepository.artist.saveArtist(item, { incremental: false });
          break;
        case SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST:
          await this._connectorSpotifyRepository.playlist.savePlaylist(item, { incremental: false });
          break;
        case SPOTIFY_ENTITY_TYPES_ENUM.ALBUM:
          await this._connectorSpotifyRepository.album.saveAlbum(item, { incremental: false });
          break;
        default:
          // @ts-ignore: Unreachable code error
          throw new Error(`Type ${item.__type} is not supported`);
      }
    }
  }

  async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await this._connectorSpotifyRepository.saveAuthenticationData(data);
  }

  async getAuthenticationData(): Promise<any> {
    return this._connectorSpotifyRepository.getAuthenticationData();
  }

  private _resolveItems<T extends SpotifyEntity>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
