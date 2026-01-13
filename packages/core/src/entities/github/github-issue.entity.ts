import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { TransformFnParams } from "class-transformer";

export class GitHubIssueEntity {
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
  stateReason!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  locked!: boolean;

  @Expose()
  htmlUrl!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  comments!: number;

  @Expose()
  repositoryId!: string | null;

  @Expose()
  repositoryName!: string | null;

  @Expose()
  repositoryFullName!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  issueCreatedAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  issueUpdatedAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  issueClosedAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { ...value } : null))
  authorData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { ...value } : null))
  assigneeData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { assignees: value } : null))
  assigneesData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  labels!: Record<string, unknown>[] | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { ...value } : null))
  milestoneData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { ...value } : null))
  reactionsData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  isPullRequest!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  createdAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  updatedAt!: Date | null;

  @Expose()
  readonly __type = "github_issue" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): GitHubIssueEntity {
    return plainToInstance(GitHubIssueEntity, data, { excludeExtraneousValues: false });
  }
}

/**
 * Transform external GitHub API response to domain entity.
 */
export function mapGitHubIssue(external: any): GitHubIssueEntity {
  const mapped = {
    ...external,
    stateReason: external.state_reason ?? external.stateReason,
    htmlUrl: external.html_url ?? external.htmlUrl,
    repositoryId: external._repositoryContext?.id ?? external.repositoryId,
    repositoryName: external._repositoryContext?.name ?? external.repositoryName,
    repositoryFullName: external._repositoryContext?.fullName ?? external.repositoryFullName,
    issueCreatedAt: external.created_at ?? external.issueCreatedAt,
    issueUpdatedAt: external.updated_at ?? external.issueUpdatedAt,
    issueClosedAt: external.closed_at ?? external.issueClosedAt,
    authorData: external.user ?? external.authorData,
    assigneeData: external.assignee ?? external.assigneeData,
    assigneesData: external.assignees ? { assignees: external.assignees } : external.assigneesData,
    milestoneData: external.milestone ?? external.milestoneData,
    reactionsData: external.reactions ?? external.reactionsData,
    isPullRequest: !!external.pull_request || external.isPullRequest === true,
    createdAt: external.created_at ?? external.createdAt,
    updatedAt: external.updated_at ?? external.updatedAt,
  };

  return plainToInstance(GitHubIssueEntity, mapped, {
    excludeExtraneousValues: true,
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapGitHubIssues(externals: unknown[]): GitHubIssueEntity[] {
  return (externals || []).map(mapGitHubIssue);
}
