import type { IConnectorStore } from "../../../shared/store/connector.store.interface";

export class ConnectorSpotifyStore implements IConnectorStore {
  async save<T>(data: T): Promise<void> {
    console.log("Saving data to Spotify store", data);
  }
}
