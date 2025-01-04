import type { SpotifyEntity } from "../../../domain/entities/spotify/connector.spotify.entities";
import type { IConnectorSpotifyRepository } from "../../../domain/entities/spotify/connector.spotify.repository.interface";
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
          await this._connectorSpotifyRepository.saveTrack(item);
          break;
        default:
          throw new Error(`Type ${item.type} is not supported`);
      }
    }
  }

  private _resolveItems<T extends SpotifyEntity>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
