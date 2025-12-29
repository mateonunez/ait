import "reflect-metadata";
import type { GitHubCommitDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * GitHub Commit entity with class-transformer decorators.
 */
export class GitHubCommitEntity {
  @Expose()
  sha!: string;

  @Expose()
  @Transform(({ value }) => value ?? "")
  message!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  messageBody!: string | null;

  @Expose()
  htmlUrl!: string;

  @Expose()
  commentsUrl!: string;

  @Expose()
  nodeId!: string;

  @Expose()
  authorName!: string | null;

  @Expose()
  authorEmail!: string | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  authorDate!: Date | null;

  @Expose()
  committerName!: string | null;

  @Expose()
  committerEmail!: string | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  committerDate!: Date | null;

  @Expose()
  treeSha!: string;

  @Expose()
  treeUrl!: string;

  @Expose()
  @Transform(({ value }) => value ?? [])
  parentShas!: string[];

  @Expose()
  @Transform(({ value }) => value ?? 0)
  additions!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  deletions!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  total!: number;

  // These are populated externally (from context)
  @Expose()
  repositoryId: string | null = null;

  @Expose()
  repositoryName: string | null = null;

  @Expose()
  repositoryFullName: string | null = null;

  @Expose()
  @Transform(({ value }) => (value ? { ...value } : null))
  authorData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => (value ? { ...value } : null))
  committerData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  filesData!: Record<string, unknown>[] | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  verification!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  metadata!: Record<string, unknown> | null;

  // Use author date as createdAt/updatedAt
  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  createdAt!: Date | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  updatedAt!: Date | null;

  @Expose()
  readonly __type = "commit" as const;
}

/**
 * Transform external GitHub API response to domain entity.
 */
export function mapGitHubCommit(external: any): GitHubCommitEntity {
  const commit = external.commit ?? {};
  const stats = external.stats ?? {};

  const msg = commit.message ?? "";
  const lines = msg.split("\n");
  const message = lines[0] || "";
  const messageBody = lines.length > 1 ? lines.slice(1).join("\n").trim() : null;

  const mapped = {
    ...external,
    message,
    messageBody,
    htmlUrl: external.html_url ?? external.htmlUrl,
    commentsUrl: external.comments_url ?? external.commentsUrl,
    nodeId: external.node_id ?? external.nodeId,
    authorName: commit.author?.name ?? external.authorName,
    authorEmail: commit.author?.email ?? external.authorEmail,
    authorDate: commit.author?.date ?? external.authorDate,
    committerName: commit.committer?.name ?? external.committerName,
    committerEmail: commit.committer?.email ?? external.committerEmail,
    committerDate: commit.committer?.date ?? external.committerDate,
    treeSha: commit.tree?.sha ?? external.treeSha,
    treeUrl: commit.tree?.url ?? external.treeUrl,
    parentShas: external.parents ? external.parents.map((p: { sha: string }) => p.sha) : external.parentShas,
    additions: stats.additions ?? external.additions ?? 0,
    deletions: stats.deletions ?? external.deletions ?? 0,
    total: stats.total ?? external.total ?? 0,
    authorData: external.author ?? external.authorData,
    committerData: external.committer ?? external.committerData,
    filesData: external.files ?? external.filesData,
    verification: commit.verification ?? external.verification,
    createdAt: commit.author?.date ?? external.createdAt,
    updatedAt: commit.committer?.date ?? external.updatedAt,
    metadata:
      external.metadata ??
      (external.url || external.comments_url
        ? {
            api_url: external.url,
            comments_url: external.comments_url,
          }
        : null),
  };

  return plainToInstance(GitHubCommitEntity, mapped, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapGitHubCommits(externals: unknown[]): GitHubCommitEntity[] {
  return externals.map(mapGitHubCommit);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function commitDomainToDataTarget(domain: GitHubCommitEntity): GitHubCommitDataTarget {
  return instanceToPlain(domain) as GitHubCommitDataTarget;
}

export function commitDataTargetToDomain(dataTarget: GitHubCommitDataTarget): GitHubCommitEntity {
  return plainToInstance(GitHubCommitEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
