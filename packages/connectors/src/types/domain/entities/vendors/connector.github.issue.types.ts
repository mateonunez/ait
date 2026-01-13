import type { GitHubIssueEntity, PaginatedResponse, PaginationParams } from "@ait/core";
import type { IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorGitHubIssueRepository {
  saveIssue(issue: GitHubIssueEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveIssues(issues: GitHubIssueEntity[]): Promise<void>;
  getIssue(id: string): Promise<GitHubIssueEntity | null>;
  fetchIssues(): Promise<GitHubIssueEntity[]>;
  getIssuesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubIssueEntity>>;
}
