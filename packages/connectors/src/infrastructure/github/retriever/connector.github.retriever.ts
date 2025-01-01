import { Octokit } from "@octokit/rest";
import type { ConnectorGitHubFetchRepositoriesResponse } from "./connector.github.retriever.interface";
import { ConnectorGitHubDataRetrieverFetchRepositoriesError } from "./connector.github.retriever.errors";

export class GitHubDataRetriever {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async fetchRepositories(): Promise<ConnectorGitHubFetchRepositoriesResponse> {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser();
      return data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Unknown error';
      throw new ConnectorGitHubDataRetrieverFetchRepositoriesError(`Invalid fetch repositories: ${message}`, message);
    }
  }
}
