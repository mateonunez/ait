import type { GitHubPullRequestEntity, PaginatedResponse, PaginationParams } from "@ait/core";
import type { IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorGitHubPullRequestRepository {
  savePullRequest(
    pullRequest: Partial<GitHubPullRequestEntity>,
    options?: IConnectorRepositorySaveOptions,
  ): Promise<void>;
  savePullRequests(pullRequests: Partial<GitHubPullRequestEntity>[]): Promise<void>;
  getPullRequest(id: string): Promise<GitHubPullRequestEntity | null>;
  fetchPullRequests(): Promise<GitHubPullRequestEntity[]>;
  getPullRequestsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubPullRequestEntity>>;
}
