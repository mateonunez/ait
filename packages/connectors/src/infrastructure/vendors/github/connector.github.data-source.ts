import {
  AItError,
  type GitHubCommitExternal,
  type GitHubPullRequestExternal,
  type GitHubRepositoryExternal,
  type PaginationParams,
  RateLimitError,
  getLogger,
} from "@ait/core";
import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";

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

export class ConnectorGitHubDataSource implements IConnectorGitHubDataSource {
  private octokit: Octokit;
  private _logger = getLogger();
  private _repositoryCache: GitHubRepositoryExternal[] | null = null;

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

      return (parsedData as GitHubRepositoryExternal[]).map((repo) => ({
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
        const owner = repo.owner?.login;
        const repoName = repo.name;

        if (!owner || !repoName) continue;

        try {
          const listResponse = await this.octokit.pulls.list({
            owner,
            repo: repoName,
            state: "all",
            per_page: params?.limit || 15,
            page: params?.page || 1,
            sort: "updated",
            direction: "desc",
          });

          // Use list data directly without N+1 detail fetching
          for (const pr of listResponse.data) {
            allPullRequests.push({
              ...pr,
              __type: "pull_request" as const,
            } as GitHubPullRequestExternal);
          }
        } catch (error: unknown) {
          this._logger.warn(`Failed to fetch PRs for ${repo.full_name}`, {
            error: error instanceof Error ? error.message : String(error),
          });
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
        const owner = repo.owner?.login;
        const repoName = repo.name;

        if (!owner || !repoName) continue;

        try {
          // Note: listCommits doesn't support 'sort' parameter - it orders by commit date
          const listResponse = await this.octokit.repos.listCommits({
            owner,
            repo: repoName,
            per_page: params?.limit || 30,
            page: params?.page || 1,
          });

          // Use list data directly without N+1 detail fetching
          for (const commit of listResponse.data) {
            const fullName = repo.full_name || `${owner}/${repoName}`;
            allCommits.push({
              ...commit,
              __type: "commit" as const,
              _repositoryContext: {
                id: repo.id.toString(),
                name: repo.name,
                fullName,
              },
            } as GitHubCommitExternal & { _repositoryContext?: { id: string; name: string; fullName: string } });
          }
        } catch (error: unknown) {
          this._logger.warn(`Failed to fetch commits for ${repo.full_name}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return allCommits;
    } catch (error: any) {
      this._handleError(error, "GITHUB_FETCH_COMMITS");
    }
  }

  async fetchAllRepositories(): Promise<GitHubRepositoryExternal[]> {
    // Return cached repositories if available
    if (this._repositoryCache) {
      return this._repositoryCache;
    }

    const allRepos: GitHubRepositoryExternal[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const repos = await this.fetchRepositories({ page, limit });
      allRepos.push(...repos);
      if (repos.length < limit) break;
      page++;
    }

    this._repositoryCache = allRepos;
    return allRepos;
  }

  /**
   * Invalidates the repository cache
   */
  public invalidateCache(): void {
    this._repositoryCache = null;
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
          page,
          sort: "updated",
          direction: "desc",
        });

        const prs = listResponse.data;

        if (prs.length > 0) {
          // Use list data directly - no N+1 detail fetching
          const mappedPRs: GitHubPullRequestExternal[] = prs.map(
            (pr) =>
              ({
                ...pr,
                __type: "pull_request" as const,
              }) as GitHubPullRequestExternal,
          );

          const nextCursor = prs.length === limit ? `${repoIndex}:${page + 1}` : `${repoIndex + 1}:1`;

          return { data: mappedPRs, nextCursor };
        }

        repoIndex++;
        page = 1;
      } catch (error) {
        this._logger.warn(`Failed to fetch PRs for ${repo.full_name}`, { error });
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
        // Note: listCommits doesn't support 'sort' parameter
        const listResponse = await this.octokit.repos.listCommits({
          owner,
          repo: repoName,
          per_page: limit,
          page,
        });

        const commits = listResponse.data;

        if (commits.length > 0) {
          // Use list data directly - no N+1 detail fetching
          const fullName = repo.full_name || `${owner}/${repoName}`;
          const mappedCommits: (GitHubCommitExternal & {
            _repositoryContext?: { id: string; name: string; fullName: string };
          })[] = commits.map(
            (commit) =>
              ({
                ...commit,
                __type: "commit" as const,
                _repositoryContext: {
                  id: repo.id.toString(),
                  name: repo.name,
                  fullName,
                },
              }) as GitHubCommitExternal & { _repositoryContext?: { id: string; name: string; fullName: string } },
          );

          const nextCursor = commits.length === limit ? `${repoIndex}:${page + 1}` : `${repoIndex + 1}:1`;

          return { data: mappedCommits, nextCursor };
        }

        repoIndex++;
        page = 1;
      } catch (error) {
        this._logger.warn(`Failed to fetch commits for ${repo.full_name}`, { error });
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
        const resetTime = resetHeader ? Number.parseInt(resetHeader, 10) * 1000 : Date.now() + 60 * 60 * 1000;
        throw new RateLimitError("github", resetTime, `GitHub rate limit exceeded in ${context}`);
      }
    }

    const message = error.response?.data?.message || error.message || "Unknown error";
    throw new AItError(context, `Invalid ${context}: ${message}`, { message }, error);
  }
}
