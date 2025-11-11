import type { components as GitHubComponents } from "../../../openapi/openapi.github.types";
import type { IConnectorRepositorySaveOptions } from "../connector.repository.interface";

/**
 * Repository interface for GitHub pull requests
 */
export interface IConnectorGitHubPullRequestRepository {
  savePullRequest(
    pullRequest: Partial<GitHubPullRequestEntity>,
    options?: IConnectorRepositorySaveOptions,
  ): Promise<void>;
  savePullRequests(pullRequests: Partial<GitHubPullRequestEntity>[]): Promise<void>;
  getPullRequest(id: string): Promise<GitHubPullRequestEntity | null>;
  getPullRequests(): Promise<GitHubPullRequestEntity[]>;
}

type GitHubPullRequest = GitHubComponents["schemas"]["pull-request"];
export interface GitHubPullRequestExternal extends Omit<GitHubPullRequest, "__type"> {
  __type: "pull_request";
}

export interface GitHubPullRequestEntity {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  draft: boolean;
  locked: boolean;
  htmlUrl: string;
  diffUrl: string | null;
  patchUrl: string | null;
  issueUrl: string | null;
  merged: boolean;
  mergedAt: Date | null;
  closedAt: Date | null;
  mergeCommitSha: string | null;
  commits: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  comments: number;
  reviewComments: number;
  headRef: string | null;
  headSha: string | null;
  baseRef: string | null;
  baseSha: string | null;
  repositoryId: string | null;
  repositoryName: string | null;
  repositoryFullName: string | null;
  mergeable: boolean | null;
  maintainerCanModify: boolean;

  // JSONB fields for complex objects
  userData: Record<string, unknown> | null;
  assigneeData: Record<string, unknown> | null;
  assigneesData: Record<string, unknown> | null;
  mergedByData: Record<string, unknown> | null;
  labels: Record<string, unknown>[] | null;
  milestoneData: Record<string, unknown> | null;
  requestedReviewersData: Record<string, unknown> | null;

  createdAt: string | null;
  updatedAt: string | null;
  __type: "pull_request";
}
