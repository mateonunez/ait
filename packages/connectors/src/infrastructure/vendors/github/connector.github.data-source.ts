import type { GitHubRepositoryExternal } from "../../../types/domain/entities/vendors/connector.github.repository.types";
import type { GitHubPullRequestExternal } from "../../../types/domain/entities/vendors/connector.github.pull-request.types";
import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";
import { AItError } from "@ait/core";

export class ConnectorGitHubDataSource implements IConnectorGitHubDataSource {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async fetchRepositories(): Promise<GitHubRepositoryExternal[]> {
    try {
      const response = await this.octokit.repos.listForAuthenticatedUser({
        per_page: 33,
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
      throw new AItError("GITHUB_FETCH_REPOS", `Invalid fetch repositories: ${message}`, { message }, error);
    }
  }

  async fetchPullRequests(): Promise<GitHubPullRequestExternal[]> {
    try {
      // First, get all repositories
      const repositories = await this.fetchRepositories();
      const allPullRequests: GitHubPullRequestExternal[] = [];

      // Fetch pull requests for each repository
      for (const repo of repositories) {
        try {
          const owner = repo.owner?.login;
          const repoName = repo.name;

          if (!owner || !repoName) {
            console.warn(`Skipping repository without owner or name: ${repo.id}`);
            continue;
          }

          const response = await this.octokit.pulls.list({
            owner,
            repo: repoName,
            state: "all",
            per_page: 33,
            sort: "updated",
            direction: "desc",
          });

          const prs = response.data.map((pr) => ({
            ...pr,
            __type: "pull_request" as const,
          }));

          allPullRequests.push(...(prs as GitHubPullRequestExternal[]));
        } catch (error: any) {
          console.error(`Failed to fetch PRs for ${repo.full_name}:`, error.message);
        }
      }

      return allPullRequests;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Unknown error";
      throw new AItError("GITHUB_FETCH_PRS", `Invalid fetch pull requests: ${message}`, { message }, error);
    }
  }
}
export type ConnectorGitHubFetchRepositoriesResponse =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];

export interface IConnectorGitHubDataSource {
  fetchRepositories(): Promise<GitHubRepositoryExternal[]>;
  fetchPullRequests(): Promise<GitHubPullRequestExternal[]>;
}
