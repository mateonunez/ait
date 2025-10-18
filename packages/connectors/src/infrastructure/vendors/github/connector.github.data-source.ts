import type { GitHubRepositoryExternal } from "@/types/domain/entities/vendors/connector.github.repository.types";
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
        sort: "updated",
        direction: "desc",
        affiliation: "owner,collaborator,organization_member",
      });
      const data = response.data;

      let parsedData = data;
      if (typeof parsedData !== "object") {
        parsedData = JSON.parse(parsedData);
      }

      const repositories = parsedData as GitHubRepositoryExternal[];

      const userResponse = await this.octokit.users.getAuthenticated();
      const username = userResponse.data.login;

      // Separate owned repos from collaborations/forks
      const ownedRepos = repositories.filter((repo) => repo.owner?.login === username);
      const otherRepos = repositories.filter((repo) => repo.owner?.login !== username);

      // Sort each group by stars
      const sortedOwnedRepos = ownedRepos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
      const sortedOtherRepos = otherRepos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));

      // Concatenate: owned repos first, then others
      const sortedRepositories = [...sortedOwnedRepos, ...sortedOtherRepos];

      return sortedRepositories.map((repo) => ({
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
