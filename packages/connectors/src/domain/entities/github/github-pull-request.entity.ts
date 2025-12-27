import "reflect-metadata";
import type { GitHubPullRequestDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * GitHub Pull Request entity with class-transformer decorators.
 */
export class GitHubPullRequestEntity {
  @Expose()
  @Transform(({ value }) => String(value))
  id!: string;

  @Expose()
  number!: number;

  @Expose()
  title!: string;

  @Expose()
  body!: string | null;

  @Expose()
  state!: string;

  @Expose()
  @Transform(({ value }) => value ?? false)
  draft!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  locked!: boolean;

  @Expose({ name: "html_url" })
  htmlUrl!: string;

  @Expose({ name: "diff_url" })
  diffUrl!: string | null;

  @Expose({ name: "patch_url" })
  patchUrl!: string | null;

  @Expose({ name: "issue_url" })
  issueUrl!: string | null;

  @Expose({ name: "merged" })
  @Transform(({ value }) => value ?? false)
  merged!: boolean;

  @Expose({ name: "merged_at" })
  @Transform(({ value }) => (value ? new Date(value) : null))
  mergedAt!: Date | null;

  @Expose({ name: "closed_at" })
  @Transform(({ value }) => (value ? new Date(value) : null))
  closedAt!: Date | null;

  @Expose({ name: "merge_commit_sha" })
  mergeCommitSha!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  commits!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  additions!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  deletions!: number;

  @Expose({ name: "changed_files" })
  @Transform(({ value }) => value ?? 0)
  changedFiles!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  comments!: number;

  @Expose({ name: "review_comments" })
  @Transform(({ value }) => value ?? 0)
  reviewComments!: number;

  @Expose({ name: "head" })
  @Transform(({ value }) => value?.ref ?? null)
  headRef!: string | null;

  @Expose({ name: "head" })
  @Transform(({ value }) => value?.sha ?? null)
  headSha!: string | null;

  @Expose({ name: "base" })
  @Transform(({ value }) => value?.ref ?? null)
  baseRef!: string | null;

  @Expose({ name: "base" })
  @Transform(({ value }) => value?.sha ?? null)
  baseSha!: string | null;

  @Expose({ name: "base" })
  @Transform(({ value }) => (value?.repo?.id ? String(value.repo.id) : null))
  repositoryId!: string | null;

  @Expose({ name: "base" })
  @Transform(({ value }) => value?.repo?.name ?? null)
  repositoryName!: string | null;

  @Expose({ name: "base" })
  @Transform(({ value }) => value?.repo?.full_name ?? null)
  repositoryFullName!: string | null;

  @Expose()
  mergeable!: boolean | null;

  @Expose()
  rebaseable!: boolean | null;

  @Expose({ name: "mergeable_state" })
  mergeableState!: string | null;

  @Expose({ name: "maintainer_can_modify" })
  @Transform(({ value }) => value ?? false)
  maintainerCanModify!: boolean;

  @Expose({ name: "author_association" })
  authorAssociation!: string | null;

  @Expose({ name: "auto_merge" })
  @Transform(({ value }) => value !== null)
  autoMerge!: boolean | null;

  @Expose({ name: "active_lock_reason" })
  activeLockReason!: string | null;

  @Expose({ name: "created_at" })
  @Transform(({ value }) => (value ? new Date(value) : null))
  prCreatedAt!: Date | null;

  @Expose({ name: "updated_at" })
  @Transform(({ value }) => (value ? new Date(value) : null))
  prUpdatedAt!: Date | null;

  @Expose({ name: "user" })
  @Transform(({ value }) => (value ? { ...value } : null))
  userData!: Record<string, unknown> | null;

  @Expose({ name: "assignee" })
  @Transform(({ value }) => (value ? { ...value } : null))
  assigneeData!: Record<string, unknown> | null;

  @Expose({ name: "assignees" })
  @Transform(({ value }) => (value ? { assignees: value } : null))
  assigneesData!: Record<string, unknown> | null;

  @Expose({ name: "merged_by" })
  @Transform(({ value }) => (value ? { ...value } : null))
  mergedByData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  labels!: Record<string, unknown>[] | null;

  @Expose({ name: "milestone" })
  @Transform(({ value }) => (value ? { ...value } : null))
  milestoneData!: Record<string, unknown> | null;

  @Expose({ name: "requested_reviewers" })
  @Transform(({ value }) => (value ? { requestedReviewers: value } : null))
  requestedReviewersData!: Record<string, unknown> | null;

  @Expose({ name: "requested_teams" })
  @Transform(({ value }) => (value ? { requestedTeams: value } : null))
  requestedTeamsData!: Record<string, unknown> | null;

  @Expose({ name: "head" })
  @Transform(({ value }) => (value?.repo ? { ...value.repo } : null))
  headRepoData!: Record<string, unknown> | null;

  @Expose({ name: "base" })
  @Transform(({ value }) => (value?.repo ? { ...value.repo } : null))
  baseRepoData!: Record<string, unknown> | null;

  // Use prCreatedAt/prUpdatedAt as createdAt/updatedAt
  @Expose({ name: "created_at" })
  @Transform(({ value }) => (value ? new Date(value) : null))
  createdAt!: Date | null;

  @Expose({ name: "updated_at" })
  @Transform(({ value }) => (value ? new Date(value) : null))
  updatedAt!: Date | null;

  readonly __type = "pull_request" as const;
}

/**
 * Transform external GitHub API response to domain entity.
 */
export function mapGitHubPullRequest(external: unknown): GitHubPullRequestEntity {
  return plainToInstance(GitHubPullRequestEntity, external, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapGitHubPullRequests(externals: unknown[]): GitHubPullRequestEntity[] {
  return externals.map(mapGitHubPullRequest);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function pullRequestDomainToDataTarget(domain: GitHubPullRequestEntity): GitHubPullRequestDataTarget {
  return instanceToPlain(domain) as GitHubPullRequestDataTarget;
}

export function pullRequestDataTargetToDomain(dataTarget: GitHubPullRequestDataTarget): GitHubPullRequestEntity {
  return plainToInstance(GitHubPullRequestEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
