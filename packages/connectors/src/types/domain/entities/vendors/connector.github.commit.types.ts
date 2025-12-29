import type { GitHubCommitEntity, PaginatedResponse, PaginationParams } from "@ait/core";
import type { IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorGitHubCommitRepository {
  saveCommit(commit: GitHubCommitEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveCommits(commits: GitHubCommitEntity[]): Promise<void>;
  getCommit(sha: string): Promise<GitHubCommitEntity | null>;
  fetchCommits(): Promise<GitHubCommitEntity[]>;
  getCommitsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubCommitEntity>>;
}
