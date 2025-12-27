import type { PaginatedResponse, PaginationParams } from "@ait/core";
import type { GitHubPullRequestEntity } from "../../../../domain/entities/github/github-pull-request.entity";
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
