import { Octokit } from "@octokit/rest";
import type {
  ConnectorGitHubFetchRepositoriesResponse,
  IConnectorGitHubDataSource,
} from "./connector.github.data-source.interface";
import { ConnectorGitHubDataSourceFetchRepositoriesError } from "./connector.github.data-source.errors";

export class ConnectorGitHubDataSource implements IConnectorGitHubDataSource {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async fetchRepositories(): Promise<ConnectorGitHubFetchRepositoriesResponse> {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser();
      return data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Unknown error";
      throw new ConnectorGitHubDataSourceFetchRepositoriesError(`Invalid fetch repositories: ${message}`, message);
    }
  }
}
