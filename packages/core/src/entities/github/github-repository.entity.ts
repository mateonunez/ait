import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { TransformFnParams } from "class-transformer";

/**
 * GitHub Repository entity with class-transformer decorators.
 */
export class GitHubRepositoryEntity {
  @Expose()
  @Transform(({ value }: TransformFnParams) => String(value))
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  stars!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  forks!: number;

  @Expose()
  language!: string | null;

  @Expose()
  url!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? "")
  fullName!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  private!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  fork!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  archived!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  disabled!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? "public")
  visibility!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  watchersCount!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  openIssuesCount!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  size!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? "main")
  defaultBranch!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? [])
  topics!: string[];

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  isTemplate!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? true)
  hasIssues!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? true)
  hasProjects!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? true)
  hasWiki!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  hasPages!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  hasDiscussions!: boolean;

  @Expose()
  homepage!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  pushedAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  licenseName!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? "")
  cloneUrl!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? "")
  sshUrl!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { ...value } : null))
  ownerData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? { ...value } : null))
  licenseData!: Record<string, unknown> | null;

  @Expose()
  metadata!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  createdAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  updatedAt!: Date | null;

  @Expose()
  readonly __type = "github_repository" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): GitHubRepositoryEntity {
    return plainToInstance(GitHubRepositoryEntity, data, { excludeExtraneousValues: false });
  }
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
    exposeDefaultValues: true,
  });
}

export function mapGitHubRepositories(externals: unknown[]): GitHubRepositoryEntity[] {
  return externals.map(mapGitHubRepository);
}
