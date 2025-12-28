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

  @Expose()
  @Transform(({ value }) => value ?? 0)
  stars!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  forks!: number;

  @Expose()
  language!: string | null;

  @Expose()
  url!: string;

  @Expose()
  @Transform(({ value }) => value ?? "")
  fullName!: string;

  @Expose()
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

  @Expose()
  @Transform(({ value }) => value ?? 0)
  watchersCount!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  openIssuesCount!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  size!: number;

  @Expose()
  @Transform(({ value }) => value ?? "main")
  defaultBranch!: string;

  @Expose()
  @Transform(({ value }) => value ?? [])
  topics!: string[];

  @Expose()
  @Transform(({ value }) => value ?? false)
  isTemplate!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? true)
  hasIssues!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? true)
  hasProjects!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? true)
  hasWiki!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  hasPages!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  hasDiscussions!: boolean;

  @Expose()
  homepage!: string | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  pushedAt!: Date | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  licenseName!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? "")
  cloneUrl!: string;

  @Expose()
  @Transform(({ value }) => value ?? "")
  sshUrl!: string;

  @Expose()
  @Transform(({ value }) => (value ? { ...value } : null))
  ownerData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => (value ? { ...value } : null))
  licenseData!: Record<string, unknown> | null;

  @Expose()
  metadata!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  createdAt!: Date | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  updatedAt!: Date | null;

  readonly __type = "repository" as const;
}

// --- External API → Domain ---

export function mapGitHubRepository(external: any): GitHubRepositoryEntity {
  const mapped = {
    ...external,
    stars: external.stargazers_count ?? external.stars ?? 0,
    fullName: external.full_name ?? external.fullName ?? "",
    watchersCount: external.watchers_count ?? external.watchersCount ?? 0,
    openIssuesCount: external.open_issues_count ?? external.openIssuesCount ?? 0,
    defaultBranch: external.default_branch ?? external.defaultBranch ?? "main",
    isTemplate: external.is_template ?? external.isTemplate ?? false,
    hasIssues: external.has_issues ?? external.hasIssues ?? true,
    hasProjects: external.has_projects ?? external.hasProjects ?? true,
    hasWiki: external.has_wiki ?? external.hasWiki ?? true,
    hasPages: external.has_pages ?? external.hasPages ?? false,
    hasDiscussions: external.has_discussions ?? external.hasDiscussions ?? false,
    pushedAt: external.pushed_at ?? external.pushedAt ?? null,
    licenseName: external.license?.name ?? external.licenseName ?? null,
    cloneUrl: external.clone_url ?? external.cloneUrl ?? "",
    sshUrl: external.ssh_url ?? external.sshUrl ?? "",
    createdAt: external.created_at ?? external.createdAt ?? null,
    updatedAt: external.updated_at ?? external.updatedAt ?? null,
    metadata:
      external.metadata ??
      (external.html_url
        ? {
            html_url: external.html_url,
            git_url: external.git_url,
            svn_url: external.svn_url,
            mirror_url: external.mirror_url,
            node_id: external.node_id,
          }
        : null),
  };

  return plainToInstance(GitHubRepositoryEntity, mapped, {
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
