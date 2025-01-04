import type { IConnectorStore } from "../../../shared/store/connector.store.interface";

export class ConnectorGitHubStore implements IConnectorStore {
  async save<T>(data: T): Promise<void> {
    console.log("Saving data to GitHub store", data);
  }
}
