import type { GitHubRepositoryExternal } from "../../../types/domain/entities/vendors/connector.github.repository.types";
import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";

export class ConnectorGitHubDataSource implements IConnectorGitHubDataSource {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async fetchRepositories(): Promise<GitHubRepositoryExternal[]> {
    try {
      const response = await this.octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: "pushed",
        direction: "desc",
        affiliation: "owner,collaborator,organization_member",
      });
      const data = response.data;

      let parsedData = data;
      if (typeof parsedData !== "object") {
        parsedData = JSON.parse(parsedData);
      }

      const repositories = parsedData as GitHubRepositoryExternal[];

      return repositories.map((repo) => ({
        ...repo,
        __type: "repository" as const,
      }));
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
