import type { PaginatedResponse, PaginationParams } from "@ait/core";
import type { GitHubCommitEntity } from "../../../../domain/entities/github/github-commit.entity";
import type { IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorGitHubCommitRepository {
  saveCommit(commit: Partial<GitHubCommitEntity>, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveCommits(commits: Partial<GitHubCommitEntity>[]): Promise<void>;
  getCommit(sha: string): Promise<GitHubCommitEntity | null>;
  fetchCommits(): Promise<GitHubCommitEntity[]>;
  getCommitsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubCommitEntity>>;
}
