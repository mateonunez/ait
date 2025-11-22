import { z } from "zod";
import type { components as GitHubComponents } from "../openapi/openapi.github.types";

export const GitHubRepositorySchema = z
  .object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
    owner: z
      .object({
        login: z.string(),
        id: z.number(),
      })
      .optional(),
    html_url: z.string().url(),
    description: z.string().nullable().optional(),
    fork: z.boolean(),
    url: z.string().url(),
    created_at: z.string().or(z.date()).optional(),
    updated_at: z.string().or(z.date()).optional(),
    pushed_at: z.string().or(z.date()).optional(),
    git_url: z.string().optional(),
    ssh_url: z.string().optional(),
    clone_url: z.string().optional(),
    svn_url: z.string().optional(),
    homepage: z.string().nullable().optional(),
    size: z.number().optional(),
    stargazers_count: z.number().optional(),
    watchers_count: z.number().optional(),
    language: z.string().nullable().optional(),
    has_issues: z.boolean().optional(),
    has_projects: z.boolean().optional(),
    has_downloads: z.boolean().optional(),
    has_wiki: z.boolean().optional(),
    has_pages: z.boolean().optional(),
    forks_count: z.number().optional(),
    mirror_url: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    disabled: z.boolean().optional(),
    open_issues_count: z.number().optional(),
    license: z
      .object({
        key: z.string(),
        name: z.string(),
        spdx_id: z.string().nullable(),
        url: z.string().nullable(),
        node_id: z.string(),
      })
      .nullable()
      .optional(),
    allow_forking: z.boolean().optional(),
    is_template: z.boolean().optional(),
    topics: z.array(z.string()).optional(),
    visibility: z.string().optional(),
    forks: z.number().optional(),
    open_issues: z.number().optional(),
    watchers: z.number().optional(),
    default_branch: z.string().optional(),
  })
  .passthrough();

export const GitHubPullRequestSchema = z
  .object({
    url: z.string().url(),
    id: z.number(),
    node_id: z.string(),
    html_url: z.string().url(),
    diff_url: z.string().url(),
    patch_url: z.string().url(),
    issue_url: z.string().url(),
    number: z.number(),
    state: z.string(),
    locked: z.boolean(),
    title: z.string(),
    user: z.object({
      login: z.string(),
      id: z.number(),
    }),
    body: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable(),
    merged_at: z.string().nullable(),
    merge_commit_sha: z.string().nullable(),
    assignee: z
      .object({
        login: z.string(),
        id: z.number(),
      })
      .nullable(),
    assignees: z
      .array(
        z.object({
          login: z.string(),
          id: z.number(),
        }),
      )
      .optional(),
    requested_reviewers: z.array(z.any()).optional(),
    requested_teams: z.array(z.any()).optional(),
    labels: z.array(z.any()).optional(),
    milestone: z.any().nullable(),
    draft: z.boolean().optional(),
    commits_url: z.string().url(),
    review_comments_url: z.string().url(),
    review_comment_url: z.string().url(),
    comments_url: z.string().url(),
    statuses_url: z.string().url(),
    head: z.object({
      label: z.string(),
      ref: z.string(),
      sha: z.string(),
      user: z.object({
        login: z.string(),
      }),
      repo: z
        .object({
          id: z.number(),
          url: z.string(),
          name: z.string(),
        })
        .nullable()
        .optional(),
    }),
    base: z.object({
      label: z.string(),
      ref: z.string(),
      sha: z.string(),
      user: z.object({
        login: z.string(),
      }),
      repo: z.object({
        id: z.number(),
        url: z.string(),
        name: z.string(),
      }),
    }),
    _links: z.any(),
    author_association: z.string(),
    auto_merge: z.any().nullable(),
    active_lock_reason: z.string().nullable().optional(),
  })
  .passthrough();

export const GitHubCommitSchema = z
  .object({
    sha: z.string(),
    node_id: z.string(),
    commit: z.object({
      author: z.object({
        name: z.string(),
        email: z.string(),
        date: z.string(),
      }),
      committer: z.object({
        name: z.string(),
        email: z.string(),
        date: z.string(),
      }),
      message: z.string(),
      tree: z.object({
        sha: z.string(),
        url: z.string(),
      }),
      url: z.string(),
      comment_count: z.number(),
      verification: z.any().optional(),
    }),
    url: z.string().url(),
    html_url: z.string().url(),
    comments_url: z.string().url(),
    author: z
      .object({
        login: z.string(),
        id: z.number(),
      })
      .nullable(),
    committer: z
      .object({
        login: z.string(),
        id: z.number(),
      })
      .nullable(),
    parents: z.array(
      z.object({
        sha: z.string(),
        url: z.string(),
        html_url: z.string().optional(),
      }),
    ),
  })
  .passthrough();

// --- External Types (from OpenAPI) ---

export interface BaseGitHubEntity {
  __type: "repository" | "issue" | "pull_request" | "commit";
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

export type GitHubExternal = GitHubRepositoryExternal | GitHubPullRequestExternal | GitHubCommitExternal;

// --- Domain Types (Zod-inferred for consistency) ---

export const GitHubRepositoryEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  stars: z.number(),
  forks: z.number(),
  language: z.string().nullable(),
  url: z.string(),
  fullName: z.string(),
  private: z.boolean(),
  fork: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean(),
  visibility: z.string(),
  watchersCount: z.number(),
  openIssuesCount: z.number(),
  size: z.number(),
  defaultBranch: z.string(),
  topics: z.array(z.string()),
  isTemplate: z.boolean(),
  hasIssues: z.boolean(),
  hasProjects: z.boolean(),
  hasWiki: z.boolean(),
  hasPages: z.boolean(),
  hasDiscussions: z.boolean(),
  homepage: z.string().nullable(),
  pushedAt: z.date().nullable(),
  licenseName: z.string().nullable(),
  cloneUrl: z.string(),
  sshUrl: z.string(),
  ownerData: z.record(z.string(), z.unknown()).nullable(),
  licenseData: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  __type: z.literal("repository"),
});

export const GitHubPullRequestEntitySchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.string(),
  draft: z.boolean(),
  locked: z.boolean(),
  htmlUrl: z.string(),
  diffUrl: z.string().nullable(),
  patchUrl: z.string().nullable(),
  issueUrl: z.string().nullable(),
  merged: z.boolean(),
  mergedAt: z.date().nullable(),
  closedAt: z.date().nullable(),
  mergeCommitSha: z.string().nullable(),
  commits: z.number(),
  additions: z.number(),
  deletions: z.number(),
  changedFiles: z.number(),
  comments: z.number(),
  reviewComments: z.number(),
  headRef: z.string().nullable(),
  headSha: z.string().nullable(),
  baseRef: z.string().nullable(),
  baseSha: z.string().nullable(),
  repositoryId: z.string().nullable(),
  repositoryName: z.string().nullable(),
  repositoryFullName: z.string().nullable(),
  mergeable: z.boolean().nullable(),
  rebaseable: z.boolean().nullable(),
  mergeableState: z.string().nullable(),
  maintainerCanModify: z.boolean(),
  authorAssociation: z.string().nullable(),
  autoMerge: z.boolean().nullable(),
  activeLockReason: z.string().nullable(),
  prCreatedAt: z.date().nullable(),
  prUpdatedAt: z.date().nullable(),
  userData: z.record(z.string(), z.unknown()).nullable(),
  assigneeData: z.record(z.string(), z.unknown()).nullable(),
  assigneesData: z.record(z.string(), z.unknown()).nullable(),
  mergedByData: z.record(z.string(), z.unknown()).nullable(),
  labels: z.array(z.record(z.string(), z.unknown())).nullable(),
  milestoneData: z.record(z.string(), z.unknown()).nullable(),
  requestedReviewersData: z.record(z.string(), z.unknown()).nullable(),
  requestedTeamsData: z.record(z.string(), z.unknown()).nullable(),
  headRepoData: z.record(z.string(), z.unknown()).nullable(),
  baseRepoData: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  __type: z.literal("pull_request"),
});

export const GitHubCommitEntitySchema = z.object({
  sha: z.string(),
  message: z.string(),
  messageBody: z.string().nullable(),
  htmlUrl: z.string(),
  commentsUrl: z.string(),
  nodeId: z.string(),
  authorName: z.string().nullable(),
  authorEmail: z.string().nullable(),
  authorDate: z.date().nullable(),
  committerName: z.string().nullable(),
  committerEmail: z.string().nullable(),
  committerDate: z.date().nullable(),
  treeSha: z.string(),
  treeUrl: z.string(),
  parentShas: z.array(z.string()),
  additions: z.number(),
  deletions: z.number(),
  total: z.number(),
  repositoryId: z.string().nullable(),
  repositoryName: z.string().nullable(),
  repositoryFullName: z.string().nullable(),
  authorData: z.record(z.string(), z.unknown()).nullable(),
  committerData: z.record(z.string(), z.unknown()).nullable(),
  filesData: z.array(z.record(z.string(), z.unknown())).nullable(),
  verification: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  __type: z.literal("commit"),
});

export type GitHubRepositoryEntity = z.infer<typeof GitHubRepositoryEntitySchema>;
export type GitHubPullRequestEntity = z.infer<typeof GitHubPullRequestEntitySchema>;
export type GitHubCommitEntity = z.infer<typeof GitHubCommitEntitySchema>;

export type GitHubEntity = GitHubRepositoryEntity | GitHubPullRequestEntity | GitHubCommitEntity;
