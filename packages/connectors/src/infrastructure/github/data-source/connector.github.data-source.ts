import { Octokit } from "@octokit/rest";
import type { IConnectorGitHubDataSource } from "./connector.github.data-source.interface";
import { ConnectorGitHubDataSourceFetchRepositoriesError } from "./connector.github.data-source.errors";
import type { GitHubRepository } from "../../../domain/entities/github/connector.github.entities";

export class ConnectorGitHubDataSource implements IConnectorGitHubDataSource {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async fetchRepositories(): Promise<GitHubRepository[]> {
    try {
      const { data } = (await this.octokit.repos.listForAuthenticatedUser()) as unknown as { data: GitHubRepository[] };
      return data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Unknown error";
      throw new ConnectorGitHubDataSourceFetchRepositoriesError(`Invalid fetch repositories: ${message}`, message);
    }
  }
}
