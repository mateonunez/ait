import type { GitHubRepositoryExternal } from "@/types/domain/entities/vendors/connector.github.repository.types";
import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";

export class ConnectorGitHubDataSource implements IConnectorGitHubDataSource {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async fetchRepositories(): Promise<GitHubRepositoryExternal[]> {
    try {
      const { data } = (await this.octokit.repos.listForAuthenticatedUser()) as unknown as {
        data: GitHubRepositoryExternal[];
      };
      return data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Unknown error";
      throw new ConnectorGitHubDataSourceFetchRepositoriesError(`Invalid fetch repositories: ${message}`, message);
    }
  }
}

export class ConnectorGitHubDataSourceFetchRepositoriesError extends Error {
  public responseBody: string;

  constructor(message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorGitHubDataSourceFetchRepositoriesError";
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorGitHubDataSourceFetchRepositoriesError.prototype);
  }
}
export type ConnectorGitHubFetchRepositoriesResponse =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];

export interface IConnectorGitHubDataSource {
  fetchRepositories(): Promise<GitHubRepositoryExternal[]>;
}
