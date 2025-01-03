import type { ConnectorGitHubFetchRepositoriesResponse } from "../../infrastructure/github/data-source/connector.github.data-source.interface";

export interface IConnectorGitHubService {
  getRepositories(): Promise<ConnectorGitHubFetchRepositoriesResponse>;
}
