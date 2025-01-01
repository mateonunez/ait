import type { IConnectorStore } from "../../../shared/store/connector.store.interface";

export class ConnectorGitHubStore implements IConnectorStore<any> {
  async save(data: any): Promise<void> {
    console.log("Saving data to GitHub store", data);
  }
}
