import type { SpotifyEntity } from "../../../domain/entities/spotify/connector.spotify.entities";
import type { IConnectorSpotifyRepository } from "../../../domain/entities/spotify/connector.spotify.repository.interface";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth.interface";
import type { IConnectorStore } from "../../../shared/store/connector.store.interface";

export class ConnectorSpotifyStore implements IConnectorStore {
  private _connectorSpotifyRepository: IConnectorSpotifyRepository;

  constructor(connectorSpotifyRepository: IConnectorSpotifyRepository) {
    this._connectorSpotifyRepository = connectorSpotifyRepository;
  }

  async save<T extends SpotifyEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.type) {
        case "track":
          await this._connectorSpotifyRepository.track.saveTrack(item, { incremental: true });
          break;
        default:
          throw new Error(`Type ${item.type} is not supported`);
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
