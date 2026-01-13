import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import type { LinearIssueExternal } from "../../types/integrations";

/**
 * Linear Issue entity with class-transformer decorators.
 */
export class LinearIssueEntity {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  description!: string | null;

  @Expose()
  state!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  priority!: number | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  assigneeId!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  assigneeName!: string | null;

  @Expose()
  teamId!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  teamName!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  projectId!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  projectName!: string | null;

  @Expose()
  url!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? [])
  labels!: string[];

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "linear_issue" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): LinearIssueEntity {
    return plainToInstance(LinearIssueEntity, data, { excludeExtraneousValues: false });
  }
}

/**
 * Transform external Linear API response to domain entity.
 */
export function mapLinearIssue(external: LinearIssueExternal): LinearIssueEntity {
  const mapped = {
    ...external,
    state: external.state?.name ?? "unknown",
    assigneeId: external.assignee?.id ?? null,
    assigneeName: external.assignee?.name ?? null,
    teamId: external.team?.id ?? "",
    teamName: external.team?.name ?? null,
    projectId: external.project?.id ?? null,
    projectName: external.project?.name ?? null,
    labels: external.labels?.nodes?.map((label) => label.name) ?? [],
  };

  return plainToInstance(LinearIssueEntity, mapped, {
    excludeExtraneousValues: true,
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapLinearIssues(externals: LinearIssueExternal[]): LinearIssueEntity[] {
  return externals.map(mapLinearIssue);
}
