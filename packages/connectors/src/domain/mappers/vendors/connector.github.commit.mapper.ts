import type { GitHubCommitEntity, GitHubCommitExternal } from "@ait/core";
import type { GitHubCommitDataTarget } from "@ait/postgres";
import type { ConnectorMapperDefinition } from "../../../types/domain/mappers/connector.mapper.interface";
import { ConnectorMapper } from "../connector.mapper";
import { ensureDate } from "../utils/connector.mapper.utils";

function parseCommitMessage(message: string): { subject: string; body: string | null } {
  const lines = message.split("\n");
  const subject = lines[0] || "";
  const bodyLines = lines.slice(1).filter((line) => line.trim().length > 0);
  const body = bodyLines.length > 0 ? bodyLines.join("\n") : null;
  return { subject, body };
}

const githubCommitMapping: ConnectorMapperDefinition<GitHubCommitExternal, GitHubCommitEntity, GitHubCommitDataTarget> =
  {
    sha: {
      external: (external) => external.sha,
      domain: (domain) => domain.sha,
      dataTarget: (dataTarget) => dataTarget.sha,
    },

    message: {
      external: (external) => {
        const parsed = parseCommitMessage(external.commit?.message || "");
        return parsed.subject;
      },
      domain: (domain) => domain.message,
      dataTarget: (dataTarget) => dataTarget.message ?? "",
    },

    messageBody: {
      external: (external) => {
        const parsed = parseCommitMessage(external.commit?.message || "");
        return parsed.body;
      },
      domain: (domain) => domain.messageBody,
      dataTarget: (dataTarget) => dataTarget.messageBody ?? null,
    },

    htmlUrl: {
      external: (external) => external.html_url,
      domain: (domain) => domain.htmlUrl,
      dataTarget: (dataTarget) => dataTarget.htmlUrl ?? "",
    },

    commentsUrl: {
      external: (external) => external.comments_url,
      domain: (domain) => domain.commentsUrl,
      dataTarget: (dataTarget) => dataTarget.commentsUrl ?? "",
    },

    nodeId: {
      external: (external) => external.node_id,
      domain: (domain) => domain.nodeId,
      dataTarget: (dataTarget) => dataTarget.nodeId ?? "",
    },

    authorName: {
      external: (external) => external.commit?.author?.name ?? null,
      domain: (domain) => domain.authorName,
      dataTarget: (dataTarget) => dataTarget.authorName ?? null,
    },

    authorEmail: {
      external: (external) => external.commit?.author?.email ?? null,
      domain: (domain) => domain.authorEmail,
      dataTarget: (dataTarget) => dataTarget.authorEmail ?? null,
    },

    authorDate: {
      external: (external) => (external.commit?.author?.date ? new Date(external.commit.author.date) : null),
      domain: (domain) => ensureDate(domain.authorDate),
      dataTarget: (dataTarget) => dataTarget.authorDate ?? null,
    },

    committerName: {
      external: (external) => external.commit?.committer?.name ?? null,
      domain: (domain) => domain.committerName,
      dataTarget: (dataTarget) => dataTarget.committerName ?? null,
    },

    committerEmail: {
      external: (external) => external.commit?.committer?.email ?? null,
      domain: (domain) => domain.committerEmail,
      dataTarget: (dataTarget) => dataTarget.committerEmail ?? null,
    },

    committerDate: {
      external: (external) => (external.commit?.committer?.date ? new Date(external.commit.committer.date) : null),
      domain: (domain) => ensureDate(domain.committerDate),
      dataTarget: (dataTarget) => dataTarget.committerDate ?? null,
    },

    treeSha: {
      external: (external) => external.commit?.tree?.sha ?? "",
      domain: (domain) => domain.treeSha,
      dataTarget: (dataTarget) => dataTarget.treeSha ?? "",
    },

    treeUrl: {
      external: (external) => external.commit?.tree?.url ?? "",
      domain: (domain) => domain.treeUrl,
      dataTarget: (dataTarget) => dataTarget.treeUrl ?? "",
    },

    parentShas: {
      external: (external) => external.parents?.map((p) => p.sha) ?? [],
      domain: (domain) => domain.parentShas,
      dataTarget: (dataTarget) => dataTarget.parentShas ?? [],
    },

    additions: {
      external: (external) => external.stats?.additions ?? 0,
      domain: (domain) => domain.additions,
      dataTarget: (dataTarget) => dataTarget.additions ?? 0,
    },

    deletions: {
      external: (external) => external.stats?.deletions ?? 0,
      domain: (domain) => domain.deletions,
      dataTarget: (dataTarget) => dataTarget.deletions ?? 0,
    },

    total: {
      external: (external) => external.stats?.total ?? 0,
      domain: (domain) => domain.total,
      dataTarget: (dataTarget) => dataTarget.total ?? 0,
    },

    repositoryId: {
      external: (external) => {
        // Extract repository context from temporary field if present
        const enrichedExternal = external as GitHubCommitExternal & {
          _repositoryContext?: { id: string; name: string; fullName: string };
        };
        return enrichedExternal._repositoryContext?.id ?? null;
      },
      domain: (domain) => domain.repositoryId,
      dataTarget: (dataTarget) => dataTarget.repositoryId ?? null,
    },

    repositoryName: {
      external: (external) => {
        // Extract repository context from temporary field if present
        const enrichedExternal = external as GitHubCommitExternal & {
          _repositoryContext?: { id: string; name: string; fullName: string };
        };
        return enrichedExternal._repositoryContext?.name ?? null;
      },
      domain: (domain) => domain.repositoryName,
      dataTarget: (dataTarget) => dataTarget.repositoryName ?? null,
    },

    repositoryFullName: {
      external: (external) => {
        // Extract repository context from temporary field if present
        const enrichedExternal = external as GitHubCommitExternal & {
          _repositoryContext?: { id: string; name: string; fullName: string };
        };
        return enrichedExternal._repositoryContext?.fullName ?? null;
      },
      domain: (domain) => domain.repositoryFullName,
      dataTarget: (dataTarget) => dataTarget.repositoryFullName ?? null,
    },

    authorData: {
      external: (external) => (external.author ? ({ ...external.author } as Record<string, unknown>) : null),
      domain: (domain) => domain.authorData,
      dataTarget: (dataTarget) => (dataTarget.authorData as Record<string, unknown> | null) ?? null,
    },

    committerData: {
      external: (external) => (external.committer ? ({ ...external.committer } as Record<string, unknown>) : null),
      domain: (domain) => domain.committerData,
      dataTarget: (dataTarget) => (dataTarget.committerData as Record<string, unknown> | null) ?? null,
    },

    filesData: {
      external: (external) =>
        external.files && external.files.length > 0
          ? (external.files.map((f) => ({ ...f })) as Record<string, unknown>[])
          : null,
      domain: (domain) => domain.filesData,
      dataTarget: (dataTarget) => (dataTarget.filesData as Record<string, unknown>[] | null) ?? null,
    },

    verification: {
      external: (external) =>
        external.commit?.verification ? ({ ...external.commit.verification } as Record<string, unknown>) : null,
      domain: (domain) => domain.verification,
      dataTarget: (dataTarget) => (dataTarget.verification as Record<string, unknown> | null) ?? null,
    },

    metadata: {
      external: (external) => {
        const metadata: Record<string, unknown> = {};
        if (external.url) metadata.url = external.url;

        return Object.keys(metadata).length > 0 ? metadata : null;
      },
      domain: (domain) => domain.metadata,
      dataTarget: (dataTarget) => (dataTarget.metadata as Record<string, unknown> | null) ?? null,
    },

    createdAt: {
      external: (external) => {
        const date = external.commit?.author?.date || null;
        return date ? new Date(date) : null;
      },
      domain: (domain) => ensureDate(domain.createdAt),
      dataTarget: (dataTarget) => dataTarget.createdAt ?? null,
    },

    updatedAt: {
      external: (external) => {
        const date = external.commit?.author?.date || null;
        return date ? new Date(date) : null;
      },
      domain: (domain) => ensureDate(domain.updatedAt),
      dataTarget: (dataTarget) => dataTarget.updatedAt ?? null,
    },

    __type: {
      external: () => "commit" as const,
      domain: (domain) => domain.__type,
      dataTarget: () => "commit" as const,
    },
  };

const domainDefaults = { __type: "commit" as const };

export const connectorGithubCommitMapper = new ConnectorMapper<
  GitHubCommitExternal,
  GitHubCommitEntity,
  GitHubCommitDataTarget
>(githubCommitMapping, domainDefaults);
