import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { TransformFnParams } from "class-transformer";

/**
 * GitHub Pull Request entity with class-transformer decorators.
 */
export class GitHubPullRequestEntity {
  @Expose()
  @Transform(({ value }: TransformFnParams) => String(value))
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
  @Transform(({ value }: TransformFnParams) => value ?? false)
  draft!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  locked!: boolean;

  @Expose()
  htmlUrl!: string;

  @Expose()
  diffUrl!: string | null;

  @Expose()
  patchUrl!: string | null;

  @Expose()
  issueUrl!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  merged!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  mergedAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  closedAt!: Date | null;

  @Expose()
  mergeCommitSha!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  commits!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  additions!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  deletions!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  changedFiles!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  comments!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  reviewComments!: number;

  @Expose()
  headRef!: string | null;

  @Expose()
  headSha!: string | null;

  @Expose()
  baseRef!: string | null;

  @Expose()
  baseSha!: string | null;

  @Expose()
  repositoryId!: string | null;

  @Expose()
  repositoryName!: string | null;

  @Expose()
  repositoryFullName!: string | null;

  @Expose()
  mergeable!: boolean | null;

  @Expose()
  rebaseable!: boolean | null;

  @Expose()
  mergeableState!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  maintainerCanModify!: boolean;

  @Expose()
  authorAssociation!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value !== null)
  autoMerge!: boolean | null;

  @Expose()
  activeLockReason!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  prCreatedAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  prUpdatedAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { ...value } : null))
  userData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { ...value } : null))
  assigneeData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { assignees: value } : null))
  assigneesData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { ...value } : null))
  mergedByData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  labels!: Record<string, unknown>[] | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { ...value } : null))
  milestoneData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { requestedReviewers: value } : null))
  requestedReviewersData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { requestedTeams: value } : null))
  requestedTeamsData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value?.repo ? { ...value.repo } : null))
  headRepoData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value?.repo ? { ...value.repo } : null))
  baseRepoData!: Record<string, unknown> | null;

  // Use prCreatedAt/prUpdatedAt as createdAt/updatedAt
  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  createdAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  updatedAt!: Date | null;

  @Expose()
  readonly __type = "github_pull_request" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): GitHubPullRequestEntity {
    return plainToInstance(GitHubPullRequestEntity, data, { excludeExtraneousValues: false });
  }
}

/**
 * Transform external GitHub API response to domain entity.
 */
export function mapGitHubPullRequest(external: any): GitHubPullRequestEntity {
  const mapped = {
    ...external,
    htmlUrl: external.html_url ?? external.htmlUrl,
    diffUrl: external.diff_url ?? external.diffUrl,
    patchUrl: external.patch_url ?? external.patchUrl,
    issueUrl: external.issue_url ?? external.issueUrl,
    mergedAt: external.merged_at ?? external.mergedAt,
    closedAt: external.closed_at ?? external.closedAt,
    mergeCommitSha: external.merge_commit_sha ?? external.mergeCommitSha,
    changedFiles: external.changed_files ?? external.changedFiles ?? 0,
    reviewComments: external.review_comments ?? external.reviewComments ?? 0,
    headRef: external.head?.ref ?? external.headRef,
    headSha: external.head?.sha ?? external.headSha,
    baseRef: external.base?.ref ?? external.baseRef,
    baseSha: external.base?.sha ?? external.baseSha,
    repositoryId: external.base?.repo?.id ? String(external.base.repo.id) : external.repositoryId,
    repositoryName: external.base?.repo?.name ?? external.repositoryName,
    repositoryFullName: external.base?.repo?.full_name ?? external.repositoryFullName,
    mergeableState: external.mergeable_state ?? external.mergeableState,
    maintainerCanModify: external.maintainer_can_modify ?? external.maintainerCanModify ?? false,
    authorAssociation: external.author_association ?? external.authorAssociation,
    autoMerge: external.auto_merge !== undefined ? external.auto_merge !== null : external.autoMerge,
    activeLockReason: external.active_lock_reason ?? external.activeLockReason,
    prCreatedAt: external.created_at ?? external.prCreatedAt,
    prUpdatedAt: external.updated_at ?? external.prUpdatedAt,
    userData: external.user ?? external.userData,
    assigneeData: external.assignee ?? external.assigneeData,
    assigneesData: external.assignees ? { assignees: external.assignees } : external.assigneesData,
    mergedByData: external.merged_by ?? external.mergedByData,
    milestoneData: external.milestone ?? external.milestoneData,
    requestedReviewersData: external.requested_reviewers
      ? { requestedReviewers: external.requested_reviewers }
      : external.requestedReviewersData,
    requestedTeamsData: external.requested_teams
      ? { requestedTeams: external.requested_teams }
      : external.requestedTeamsData,
    headRepoData: external.head?.repo ?? external.headRepoData,
    baseRepoData: external.base?.repo ?? external.baseRepoData,
    createdAt: external.created_at ?? external.createdAt,
    updatedAt: external.updated_at ?? external.updatedAt,
  };

  return plainToInstance(GitHubPullRequestEntity, mapped, {
    excludeExtraneousValues: true,
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapGitHubPullRequests(externals: unknown[]): GitHubPullRequestEntity[] {
  return externals.map(mapGitHubPullRequest);
}
