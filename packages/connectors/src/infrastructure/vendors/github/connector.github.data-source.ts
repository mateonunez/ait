import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";
import {
  AItError,
  type PaginationParams,
  type GitHubCommitExternal,
  type GitHubPullRequestExternal,
  type GitHubRepositoryExternal,
} from "@ait/core";

export class ConnectorGitHubDataSource implements IConnectorGitHubDataSource {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async fetchRepositories(params?: PaginationParams): Promise<GitHubRepositoryExternal[]> {
    try {
      const response = await this.octokit.repos.listForAuthenticatedUser({
        per_page: params?.limit || 33,
        page: params?.page || 1,
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

  async fetchPullRequests(params?: PaginationParams): Promise<GitHubPullRequestExternal[]> {
    try {
      const repositories = await this.fetchRepositories(params);
      const allPullRequests: GitHubPullRequestExternal[] = [];

      for (const repo of repositories) {
        try {
          const owner = repo.owner?.login;
          const repoName = repo.name;

          if (!owner || !repoName) {
            continue;
          }

          const listResponse = await this.octokit.pulls.list({
            owner,
            repo: repoName,
            state: "all",
            per_page: params?.limit || 15,
            page: params?.page || 1,
            sort: "updated",
            direction: "desc",
          });

          for (const pr of listResponse.data) {
            try {
              const detailedResponse = await this.octokit.pulls.get({
                owner,
                repo: repoName,
                pull_number: pr.number,
              });

              allPullRequests.push({
                ...detailedResponse.data,
                __type: "pull_request" as const,
              } as GitHubPullRequestExternal);
            } catch (prError: unknown) {
              console.error(
                `Failed to fetch PR #${pr.number} details for ${repo.full_name}:`,
                prError instanceof Error ? prError.message : String(prError),
              );
              allPullRequests.push({
                ...pr,
                __type: "pull_request" as const,
              } as GitHubPullRequestExternal);
            }
          }
        } catch (error: unknown) {
          console.error(
            `Failed to fetch PRs for ${repo.full_name}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      return allPullRequests;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Unknown error";
      throw new AItError("GITHUB_FETCH_PRS", `Invalid fetch pull requests: ${message}`, { message }, error);
    }
  }

  async fetchCommits(params?: PaginationParams): Promise<GitHubCommitExternal[]> {
    try {
      const repositories = await this.fetchRepositories(params);
      const allCommits: GitHubCommitExternal[] = [];

      for (const repo of repositories) {
        try {
          const owner = repo.owner?.login;
          const repoName = repo.name;

          if (!owner || !repoName) {
            continue;
          }

          // Fetch list of commits
          const listResponse = await this.octokit.repos.listCommits({
            owner,
            repo: repoName,
            per_page: params?.limit || 30,
            page: params?.page || 1,
            sort: "updated",
            direction: "desc",
          });

          // Fetch detailed commit data with files/patch for each commit
          for (const commitListItem of listResponse.data) {
            try {
              console.info(`[ConnectorGitHubDataSource] Fetching detailed commit data for ${commitListItem.sha}...`);
              const detailedResponse = await this.octokit.repos.getCommit({
                owner,
                repo: repoName,
                ref: commitListItem.sha,
              });

              // Return clean commit data - repository context will be added via enrichment
              const commit = {
                ...detailedResponse.data,
                __type: "commit" as const,
                // Store repository context temporarily for mapper extraction
                // This is not part of the GitHub API schema but needed for enrichment
                _repositoryContext: {
                  id: repo.id.toString(),
                  name: repo.name,
                  fullName: repo.full_name || (repo as any).fullName || `${owner}/${repoName}`,
                },
              } as GitHubCommitExternal & { _repositoryContext?: { id: string; name: string; fullName: string } };

              allCommits.push(commit);
            } catch (commitError: unknown) {
              console.error(
                `Failed to fetch commit ${commitListItem.sha} details for ${repo.full_name}:`,
                commitError instanceof Error ? commitError.message : String(commitError),
              );
              const fallbackCommit = {
                ...commitListItem,
                __type: "commit" as const,
                _repositoryContext: {
                  id: repo.id.toString(),
                  name: repo.name,
                  fullName: repo.full_name || (repo as any).fullName || `${owner}/${repoName}`,
                },
              } as GitHubCommitExternal & { _repositoryContext?: { id: string; name: string; fullName: string } };

              allCommits.push(fallbackCommit);
            }
          }
        } catch (error: unknown) {
          console.error(
            `Failed to fetch commits for ${repo.full_name}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      return allCommits;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new AItError("GITHUB_FETCH_COMMITS", `Invalid fetch commits: ${message}`, { message }, error);
    }
  }
}
export type ConnectorGitHubFetchRepositoriesResponse =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];

export interface IConnectorGitHubDataSource {
  fetchRepositories(params?: PaginationParams): Promise<GitHubRepositoryExternal[]>;
  fetchPullRequests(params?: PaginationParams): Promise<GitHubPullRequestExternal[]>;
  fetchCommits(params?: PaginationParams): Promise<GitHubCommitExternal[]>;
}
