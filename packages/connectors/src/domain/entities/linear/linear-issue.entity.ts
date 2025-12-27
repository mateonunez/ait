import "reflect-metadata";
import type { LinearIssueExternal } from "@ait/core";
import type { LinearIssueDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Linear Issue entity with class-transformer decorators.
 */
export class LinearIssueEntity {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  description!: string | null;

  @Expose()
  state!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  priority!: number | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  assigneeId!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  assigneeName!: string | null;

  @Expose()
  teamId!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  teamName!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  projectId!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  projectName!: string | null;

  @Expose()
  url!: string;

  @Expose()
  @Transform(({ value }) => value ?? [])
  labels!: string[];

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  readonly __type = "issue" as const;
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
  });
}

/**
 * Transform array of external responses.
 */
export function mapLinearIssues(externals: LinearIssueExternal[]): LinearIssueEntity[] {
  return externals.map(mapLinearIssue);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function linearIssueDomainToDataTarget(domain: LinearIssueEntity): LinearIssueDataTarget {
  return instanceToPlain(domain) as LinearIssueDataTarget;
}

export function linearIssueDataTargetToDomain(dataTarget: LinearIssueDataTarget): LinearIssueEntity {
  return plainToInstance(LinearIssueEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
