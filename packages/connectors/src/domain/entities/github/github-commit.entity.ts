import "reflect-metadata";
import type { GitHubCommitDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * GitHub Commit entity with class-transformer decorators.
 */
export class GitHubCommitEntity {
  @Expose()
  sha!: string;

  @Expose({ name: "commit" })
  @Transform(({ value }) => value?.message?.split("\n")[0] ?? "")
  message!: string;

  @Expose({ name: "commit" })
  @Transform(({ value }) => {
    const msg = value?.message ?? "";
    const lines = msg.split("\n");
    return lines.length > 1 ? lines.slice(1).join("\n").trim() : null;
  })
  messageBody!: string | null;

  @Expose({ name: "html_url" })
  htmlUrl!: string;

  @Expose({ name: "comments_url" })
  commentsUrl!: string;

  @Expose({ name: "node_id" })
  nodeId!: string;

  @Expose({ name: "commit" })
  @Transform(({ value }) => value?.author?.name ?? null)
  authorName!: string | null;

  @Expose({ name: "commit" })
  @Transform(({ value }) => value?.author?.email ?? null)
  authorEmail!: string | null;

  @Expose({ name: "commit" })
  @Transform(({ value }) => (value?.author?.date ? new Date(value.author.date) : null))
  authorDate!: Date | null;

  @Expose({ name: "commit" })
  @Transform(({ value }) => value?.committer?.name ?? null)
  committerName!: string | null;

  @Expose({ name: "commit" })
  @Transform(({ value }) => value?.committer?.email ?? null)
  committerEmail!: string | null;

  @Expose({ name: "commit" })
  @Transform(({ value }) => (value?.committer?.date ? new Date(value.committer.date) : null))
  committerDate!: Date | null;

  @Expose({ name: "commit" })
  @Transform(({ value }) => value?.tree?.sha ?? "")
  treeSha!: string;

  @Expose({ name: "commit" })
  @Transform(({ value }) => value?.tree?.url ?? "")
  treeUrl!: string;

  @Expose({ name: "parents" })
  @Transform(({ value }) => (value ?? []).map((p: { sha: string }) => p.sha))
  parentShas!: string[];

  @Expose({ name: "stats" })
  @Transform(({ value }) => value?.additions ?? 0)
  additions!: number;

  @Expose({ name: "stats" })
  @Transform(({ value }) => value?.deletions ?? 0)
  deletions!: number;

  @Expose({ name: "stats" })
  @Transform(({ value }) => value?.total ?? 0)
  total!: number;

  // These are populated externally (from context)
  repositoryId: string | null = null;
  repositoryName: string | null = null;
  repositoryFullName: string | null = null;

  @Expose({ name: "author" })
  @Transform(({ value }) => (value ? { ...value } : null))
  authorData!: Record<string, unknown> | null;

  @Expose({ name: "committer" })
  @Transform(({ value }) => (value ? { ...value } : null))
  committerData!: Record<string, unknown> | null;

  @Expose({ name: "files" })
  @Transform(({ value }) => value ?? null)
  filesData!: Record<string, unknown>[] | null;

  @Expose({ name: "commit" })
  @Transform(({ value }) => value?.verification ?? null)
  verification!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ obj }) => {
    const metadata: Record<string, unknown> = {};
    if (obj.url) metadata.api_url = obj.url;
    if (obj.comments_url) metadata.comments_url = obj.comments_url;
    return Object.keys(metadata).length > 0 ? metadata : null;
  })
  metadata!: Record<string, unknown> | null;

  // Use author date as createdAt/updatedAt
  @Expose({ name: "commit" })
  @Transform(({ value }) => (value?.author?.date ? new Date(value.author.date) : null))
  createdAt!: Date | null;

  @Expose({ name: "commit" })
  @Transform(({ value }) => (value?.committer?.date ? new Date(value.committer.date) : null))
  updatedAt!: Date | null;

  readonly __type = "commit" as const;
}

/**
 * Transform external GitHub API response to domain entity.
 */
export function mapGitHubCommit(external: unknown): GitHubCommitEntity {
  return plainToInstance(GitHubCommitEntity, external, {
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
