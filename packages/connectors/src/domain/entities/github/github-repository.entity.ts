import "reflect-metadata";
import type { GitHubRepositoryDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * GitHub Repository entity with class-transformer decorators.
 */
export class GitHubRepositoryEntity {
  @Expose()
  @Transform(({ value }) => String(value))
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string | null;

  @Expose({ name: "stargazers_count" })
  @Transform(({ value }) => value ?? 0)
  stars!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  forks!: number;

  @Expose()
  language!: string | null;

  @Expose()
  url!: string;

  @Expose({ name: "full_name" })
  @Transform(({ value }) => value ?? "")
  fullName!: string;

  @Expose({ name: "private" })
  @Transform(({ value }) => value ?? false)
  private!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  fork!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  archived!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  disabled!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? "public")
  visibility!: string;

  @Expose({ name: "watchers_count" })
  @Transform(({ value }) => value ?? 0)
  watchersCount!: number;

  @Expose({ name: "open_issues_count" })
  @Transform(({ value }) => value ?? 0)
  openIssuesCount!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  size!: number;

  @Expose({ name: "default_branch" })
  @Transform(({ value }) => value ?? "main")
  defaultBranch!: string;

  @Expose()
  @Transform(({ value }) => value ?? [])
  topics!: string[];

  @Expose({ name: "is_template" })
  @Transform(({ value }) => value ?? false)
  isTemplate!: boolean;

  @Expose({ name: "has_issues" })
  @Transform(({ value }) => value ?? true)
  hasIssues!: boolean;

  @Expose({ name: "has_projects" })
  @Transform(({ value }) => value ?? true)
  hasProjects!: boolean;

  @Expose({ name: "has_wiki" })
  @Transform(({ value }) => value ?? true)
  hasWiki!: boolean;

  @Expose({ name: "has_pages" })
  @Transform(({ value }) => value ?? false)
  hasPages!: boolean;

  @Expose({ name: "has_discussions" })
  @Transform(({ value }) => value ?? false)
  hasDiscussions!: boolean;

  @Expose()
  homepage!: string | null;

  @Expose({ name: "pushed_at" })
  @Transform(({ value }) => (value ? new Date(value) : null))
  pushedAt!: Date | null;

  @Expose({ name: "license" })
  @Transform(({ value }) => value?.name ?? null)
  licenseName!: string | null;

  @Expose({ name: "clone_url" })
  @Transform(({ value }) => value ?? "")
  cloneUrl!: string;

  @Expose({ name: "ssh_url" })
  @Transform(({ value }) => value ?? "")
  sshUrl!: string;

  @Expose({ name: "owner" })
  @Transform(({ value }) => (value ? { ...value } : null))
  ownerData!: Record<string, unknown> | null;

  @Expose({ name: "license" })
  @Transform(({ value }) => (value ? { ...value } : null))
  licenseData!: Record<string, unknown> | null;

  @Expose({ name: "html_url" })
  @Transform(({ obj }) => {
    const metadata: Record<string, unknown> = {};
    if (obj.html_url) metadata.html_url = obj.html_url;
    if (obj.git_url) metadata.git_url = obj.git_url;
    if (obj.svn_url) metadata.svn_url = obj.svn_url;
    if (obj.mirror_url) metadata.mirror_url = obj.mirror_url;
    if (obj.node_id) metadata.node_id = obj.node_id;
    return Object.keys(metadata).length > 0 ? metadata : null;
  })
  metadata!: Record<string, unknown> | null;

  @Expose({ name: "created_at" })
  @Transform(({ value }) => (value ? new Date(value) : null))
  createdAt!: Date | null;

  @Expose({ name: "updated_at" })
  @Transform(({ value }) => (value ? new Date(value) : null))
  updatedAt!: Date | null;

  readonly __type = "repository" as const;
}

// --- External API → Domain ---

export function mapGitHubRepository(external: unknown): GitHubRepositoryEntity {
  return plainToInstance(GitHubRepositoryEntity, external, {
    excludeExtraneousValues: true,
  });
}

export function mapGitHubRepositories(externals: unknown[]): GitHubRepositoryEntity[] {
  return externals.map(mapGitHubRepository);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function repositoryDomainToDataTarget(domain: GitHubRepositoryEntity): GitHubRepositoryDataTarget {
  return instanceToPlain(domain) as GitHubRepositoryDataTarget;
}

export function repositoryDataTargetToDomain(dataTarget: GitHubRepositoryDataTarget): GitHubRepositoryEntity {
  return plainToInstance(GitHubRepositoryEntity, dataTarget, {
    excludeExtraneousValues: false, // DataTarget already has correct field names
  });
}
