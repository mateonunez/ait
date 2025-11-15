import type { components as GitHubComponents } from "../openapi/openapi.github.types";

export interface BaseGitHubEntity {
  __type: "repository" | "issue" | "pull_request" | "commit";
}

export interface GitHubRepositoryEntity extends BaseGitHubEntity {
  id: string;
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  url: string;
  fullName: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: string;
  watchersCount: number;
  openIssuesCount: number;
  size: number;
  defaultBranch: string;
  topics: string[];
  isTemplate: boolean;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  hasPages: boolean;
  hasDiscussions: boolean;
  homepage: string | null;
  pushedAt: Date | null;
  licenseName: string | null;
  cloneUrl: string;
  sshUrl: string;
  ownerData: Record<string, unknown> | null;
  licenseData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
  __type: "repository";
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
  rebaseable: boolean | null;
  mergeableState: string | null;
  maintainerCanModify: boolean;
  authorAssociation: string | null;
  autoMerge: boolean | null;
  activeLockReason: string | null;

  prCreatedAt: Date | null;
  prUpdatedAt: Date | null;

  userData: Record<string, unknown> | null;
  assigneeData: Record<string, unknown> | null;
  assigneesData: Record<string, unknown> | null;
  mergedByData: Record<string, unknown> | null;
  labels: Record<string, unknown>[] | null;
  milestoneData: Record<string, unknown> | null;
  requestedReviewersData: Record<string, unknown> | null;
  requestedTeamsData: Record<string, unknown> | null;
  headRepoData: Record<string, unknown> | null;
  baseRepoData: Record<string, unknown> | null;

  createdAt: string | null;
  updatedAt: string | null;
  __type: "pull_request";
}

export interface GitHubCommitEntity extends BaseGitHubEntity {
  sha: string;
  message: string;
  messageBody: string | null;
  htmlUrl: string;
  commentsUrl: string;
  nodeId: string;
  authorName: string | null;
  authorEmail: string | null;
  authorDate: Date | null;
  committerName: string | null;
  committerEmail: string | null;
  committerDate: Date | null;
  treeSha: string;
  treeUrl: string;
  parentShas: string[];
  additions: number;
  deletions: number;
  total: number;
  repositoryId: string | null;
  repositoryName: string | null;
  repositoryFullName: string | null;
  authorData: Record<string, unknown> | null;
  committerData: Record<string, unknown> | null;
  filesData: Record<string, unknown>[] | null;
  verification: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
  __type: "commit";
}

type GitHubRepository = GitHubComponents["schemas"]["repository"];
export interface GitHubRepositoryExternal extends Omit<GitHubRepository, "__type">, BaseGitHubEntity {
  __type: "repository";
}

type GitHubPullRequest = GitHubComponents["schemas"]["pull-request"];
export interface GitHubPullRequestExternal extends Omit<GitHubPullRequest, "__type"> {
  __type: "pull_request";
}

type GitHubCommit = GitHubComponents["schemas"]["commit"];
export interface GitHubCommitExternal extends Omit<GitHubCommit, "__type"> {
  __type: "commit";
}

export type GitHubEntity = GitHubRepositoryEntity | GitHubPullRequestEntity | GitHubCommitEntity;
export type GitHubExternal = GitHubRepositoryExternal | GitHubPullRequestExternal | GitHubCommitExternal;
