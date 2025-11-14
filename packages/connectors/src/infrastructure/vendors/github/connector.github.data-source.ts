import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";
import { AItError, type GitHubPullRequestExternal, type GitHubRepositoryExternal } from "@ait/core";

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
      const repositories = await this.fetchRepositories();
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
            per_page: 15,
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
}
export type ConnectorGitHubFetchRepositoriesResponse =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];

export interface IConnectorGitHubDataSource {
  fetchRepositories(): Promise<GitHubRepositoryExternal[]>;
  fetchPullRequests(): Promise<GitHubPullRequestExternal[]>;
}
