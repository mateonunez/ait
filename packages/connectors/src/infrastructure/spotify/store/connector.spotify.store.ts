import type { IConnectorStore } from "../../../shared/store/connector.store.interface";

export class ConnectorSpotifyStore implements IConnectorStore<any> {
  async save(data: any): Promise<void> {
    console.log("Saving data to Spotify store", data);
  }
}
