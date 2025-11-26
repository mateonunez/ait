import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";
import {
  AItError,
  RateLimitError,
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
      this._handleError(error, "GITHUB_FETCH_REPOS");
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
      this._handleError(error, "GITHUB_FETCH_PRS");
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
      this._handleError(error, "GITHUB_FETCH_COMMITS");
    }
  }

  async fetchAllRepositories(): Promise<GitHubRepositoryExternal[]> {
    const allRepos: GitHubRepositoryExternal[] = [];
    let page = 1;
    const limit = 100; // Maximize page size for efficiency

    while (true) {
      const repos = await this.fetchRepositories({ page, limit });
      allRepos.push(...repos);
      if (repos.length < limit) break;
      page++;
    }
    return allRepos;
  }

  async fetchPullRequestsPaginated(
    cursor?: string,
  ): Promise<{ data: GitHubPullRequestExternal[]; nextCursor?: string }> {
    const repositories = await this.fetchAllRepositories();
    if (repositories.length === 0) return { data: [], nextCursor: undefined };

    const parts = cursor ? cursor.split(":").map(Number) : [];
    let repoIndex = parts[0] ?? 0;
    let page = parts[1] ?? 1;
    const limit = 50;

    while (repoIndex < repositories.length) {
      const repo = repositories[repoIndex];
      if (!repo) {
        repoIndex++;
        continue;
      }
      const owner = repo.owner?.login;
      const repoName = repo.name;

      if (!owner || !repoName) {
        repoIndex++;
        page = 1;
        continue;
      }

      try {
        const listResponse = await this.octokit.pulls.list({
          owner,
          repo: repoName,
          state: "all",
          per_page: limit,
          page: page,
          sort: "updated",
          direction: "desc",
        });

        const prs = listResponse.data;

        if (prs.length > 0) {
          // Enrich PRs with details
          const enrichedPRs: GitHubPullRequestExternal[] = [];
          for (const pr of prs) {
            try {
              const detailedResponse = await this.octokit.pulls.get({
                owner,
                repo: repoName,
                pull_number: pr.number,
              });
              enrichedPRs.push({
                ...detailedResponse.data,
                __type: "pull_request" as const,
              } as GitHubPullRequestExternal);
            } catch (e) {
              enrichedPRs.push({ ...pr, __type: "pull_request" as const } as GitHubPullRequestExternal);
            }
          }

          // Return this batch
          // If we got a full page, next cursor is same repo, next page
          // If we got a partial page, we move to next repo, page 1 (effectively skipping empty checks for next page)
          // BUT: Standard pagination logic says if length == limit, there MIGHT be more.
          // So:
          const nextCursor = prs.length === limit ? `${repoIndex}:${page + 1}` : `${repoIndex + 1}:1`;

          return { data: enrichedPRs, nextCursor };
        }

        // If no PRs found for this page, move to next repo
        repoIndex++;
        page = 1;
      } catch (error) {
        console.error(`Failed to fetch PRs for ${repo.full_name}:`, error);
        // If it's a rate limit error, rethrow it to be handled by the scheduler
        if (error instanceof RateLimitError || (error as any).status === 403 || (error as any).status === 429) {
          this._handleError(error, "GITHUB_FETCH_PRS_PAGINATED");
        }
        repoIndex++;
        page = 1;
      }
    }

    return { data: [], nextCursor: undefined };
  }

  async fetchCommitsPaginated(cursor?: string): Promise<{ data: GitHubCommitExternal[]; nextCursor?: string }> {
    const repositories = await this.fetchAllRepositories();
    if (repositories.length === 0) return { data: [], nextCursor: undefined };

    const parts = cursor ? cursor.split(":").map(Number) : [];
    let repoIndex = parts[0] ?? 0;
    let page = parts[1] ?? 1;
    const limit = 50;

    while (repoIndex < repositories.length) {
      const repo = repositories[repoIndex];
      if (!repo) {
        repoIndex++;
        continue;
      }
      const owner = repo.owner?.login;
      const repoName = repo.name;

      if (!owner || !repoName) {
        repoIndex++;
        page = 1;
        continue;
      }

      try {
        const listResponse = await this.octokit.repos.listCommits({
          owner,
          repo: repoName,
          per_page: limit,
          page: page,
          sort: "updated",
          direction: "desc",
        });

        const commits = listResponse.data;

        if (commits.length > 0) {
          const enrichedCommits: GitHubCommitExternal[] = [];
          for (const commitListItem of commits) {
            try {
              const detailedResponse = await this.octokit.repos.getCommit({
                owner,
                repo: repoName,
                ref: commitListItem.sha,
              });

              enrichedCommits.push({
                ...detailedResponse.data,
                __type: "commit" as const,
                _repositoryContext: {
                  id: repo.id.toString(),
                  name: repo.name,
                  fullName: repo.full_name || (repo as any).fullName || `${owner}/${repoName}`,
                },
              } as GitHubCommitExternal & { _repositoryContext?: { id: string; name: string; fullName: string } });
            } catch (e) {
              enrichedCommits.push({
                ...commitListItem,
                __type: "commit" as const,
                _repositoryContext: {
                  id: repo.id.toString(),
                  name: repo.name,
                  fullName: repo.full_name || (repo as any).fullName || `${owner}/${repoName}`,
                },
              } as GitHubCommitExternal & { _repositoryContext?: { id: string; name: string; fullName: string } });
            }
          }

          const nextCursor = commits.length === limit ? `${repoIndex}:${page + 1}` : `${repoIndex + 1}:1`;

          return { data: enrichedCommits, nextCursor };
        }

        repoIndex++;
        page = 1;
      } catch (error) {
        console.error(`Failed to fetch commits for ${repo.full_name}:`, error);
        // If it's a rate limit error, rethrow it to be handled by the scheduler
        if (error instanceof RateLimitError || (error as any).status === 403 || (error as any).status === 429) {
          this._handleError(error, "GITHUB_FETCH_COMMITS_PAGINATED");
        }
        repoIndex++;
        page = 1;
      }
    }

    return { data: [], nextCursor: undefined };
  }

  private _handleError(error: any, context: string): never {
    if (error.status === 403 || error.status === 429) {
      const resetHeader = error.response?.headers?.["x-ratelimit-reset"];
      const remainingHeader = error.response?.headers?.["x-ratelimit-remaining"];

      if (remainingHeader === "0" || error.status === 429) {
        const resetTime = resetHeader ? Number.parseInt(resetHeader, 10) * 1000 : Date.now() + 60 * 60 * 1000; // Default 1 hour
        throw new RateLimitError("github", resetTime, `GitHub rate limit exceeded in ${context}`);
      }
    }

    const message = error.response?.data?.message || error.message || "Unknown error";
    throw new AItError(context, `Invalid ${context}: ${message}`, { message }, error);
  }
}
export type ConnectorGitHubFetchRepositoriesResponse =
  RestEndpointMethodTypes["repos"]["listForAuthenticatedUser"]["response"]["data"];

export interface IConnectorGitHubDataSource {
  fetchRepositories(params?: PaginationParams): Promise<GitHubRepositoryExternal[]>;
  fetchPullRequests(params?: PaginationParams): Promise<GitHubPullRequestExternal[]>;
  fetchCommits(params?: PaginationParams): Promise<GitHubCommitExternal[]>;
  fetchAllRepositories(): Promise<GitHubRepositoryExternal[]>;
  fetchPullRequestsPaginated(cursor?: string): Promise<{ data: GitHubPullRequestExternal[]; nextCursor?: string }>;
  fetchCommitsPaginated(cursor?: string): Promise<{ data: GitHubCommitExternal[]; nextCursor?: string }>;
}
