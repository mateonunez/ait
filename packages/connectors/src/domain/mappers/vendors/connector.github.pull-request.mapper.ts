import type { GitHubPullRequestDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import type {
  GitHubPullRequestExternal,
  GitHubPullRequestEntity,
} from "../../../types/domain/entities/vendors/connector.github.pull-request.types";
import type { ConnectorMapperDefinition } from "../../../types/domain/mappers/connector.mapper.interface";

const githubPullRequestMapping: ConnectorMapperDefinition<
  GitHubPullRequestExternal,
  GitHubPullRequestEntity,
  GitHubPullRequestDataTarget
> = {
  id: {
    external: (external) => external.id.toString(),
    domain: (domain) => domain.id,
    dataTarget: (dataTarget) => dataTarget.id,
  },

  number: {
    external: (external) => external.number,
    domain: (domain) => domain.number,
    dataTarget: (dataTarget) => dataTarget.number ?? 0,
  },

  title: {
    external: (external) => external.title,
    domain: (domain) => domain.title,
    dataTarget: (dataTarget) => dataTarget.title ?? "",
  },

  body: {
    external: (external) => external.body ?? null,
    domain: (domain) => domain.body,
    dataTarget: (dataTarget) => dataTarget.body ?? null,
  },

  state: {
    external: (external) => external.state,
    domain: (domain) => domain.state,
    dataTarget: (dataTarget) => dataTarget.state ?? "open",
  },

  draft: {
    external: (external) => external.draft ?? false,
    domain: (domain) => domain.draft,
    dataTarget: (dataTarget) => dataTarget.draft ?? false,
  },

  locked: {
    external: (external) => external.locked ?? false,
    domain: (domain) => domain.locked,
    dataTarget: (dataTarget) => dataTarget.locked ?? false,
  },

  htmlUrl: {
    external: (external) => external.html_url,
    domain: (domain) => domain.htmlUrl,
    dataTarget: (dataTarget) => dataTarget.htmlUrl ?? "",
  },

  diffUrl: {
    external: (external) => external.diff_url ?? null,
    domain: (domain) => domain.diffUrl,
    dataTarget: (dataTarget) => dataTarget.diffUrl ?? null,
  },

  patchUrl: {
    external: (external) => external.patch_url ?? null,
    domain: (domain) => domain.patchUrl,
    dataTarget: (dataTarget) => dataTarget.patchUrl ?? null,
  },

  issueUrl: {
    external: (external) => external.issue_url ?? null,
    domain: (domain) => domain.issueUrl,
    dataTarget: (dataTarget) => dataTarget.issueUrl ?? null,
  },

  merged: {
    external: (external) => external.merged ?? false,
    domain: (domain) => domain.merged,
    dataTarget: (dataTarget) => dataTarget.merged ?? false,
  },

  mergedAt: {
    external: (external) => (external.merged_at ? new Date(external.merged_at) : null),
    domain: (domain) => domain.mergedAt,
    dataTarget: (dataTarget) => dataTarget.mergedAt ?? null,
  },

  closedAt: {
    external: (external) => (external.closed_at ? new Date(external.closed_at) : null),
    domain: (domain) => domain.closedAt,
    dataTarget: (dataTarget) => dataTarget.closedAt ?? null,
  },

  mergeCommitSha: {
    external: (external) => external.merge_commit_sha ?? null,
    domain: (domain) => domain.mergeCommitSha,
    dataTarget: (dataTarget) => dataTarget.mergeCommitSha ?? null,
  },

  commits: {
    external: (external) => external.commits ?? 0,
    domain: (domain) => domain.commits,
    dataTarget: (dataTarget) => dataTarget.commits ?? 0,
  },

  additions: {
    external: (external) => external.additions ?? 0,
    domain: (domain) => domain.additions,
    dataTarget: (dataTarget) => dataTarget.additions ?? 0,
  },

  deletions: {
    external: (external) => external.deletions ?? 0,
    domain: (domain) => domain.deletions,
    dataTarget: (dataTarget) => dataTarget.deletions ?? 0,
  },

  changedFiles: {
    external: (external) => external.changed_files ?? 0,
    domain: (domain) => domain.changedFiles,
    dataTarget: (dataTarget) => dataTarget.changedFiles ?? 0,
  },

  comments: {
    external: (external) => external.comments ?? 0,
    domain: (domain) => domain.comments,
    dataTarget: (dataTarget) => dataTarget.comments ?? 0,
  },

  reviewComments: {
    external: (external) => external.review_comments ?? 0,
    domain: (domain) => domain.reviewComments,
    dataTarget: (dataTarget) => dataTarget.reviewComments ?? 0,
  },

  headRef: {
    external: (external) => external.head?.ref ?? null,
    domain: (domain) => domain.headRef,
    dataTarget: (dataTarget) => dataTarget.headRef ?? null,
  },

  headSha: {
    external: (external) => external.head?.sha ?? null,
    domain: (domain) => domain.headSha,
    dataTarget: (dataTarget) => dataTarget.headSha ?? null,
  },

  baseRef: {
    external: (external) => external.base?.ref ?? null,
    domain: (domain) => domain.baseRef,
    dataTarget: (dataTarget) => dataTarget.baseRef ?? null,
  },

  baseSha: {
    external: (external) => external.base?.sha ?? null,
    domain: (domain) => domain.baseSha,
    dataTarget: (dataTarget) => dataTarget.baseSha ?? null,
  },

  repositoryId: {
    external: (external) => (external.base?.repo?.id ? external.base.repo.id.toString() : null),
    domain: (domain) => domain.repositoryId,
    dataTarget: (dataTarget) => dataTarget.repositoryId ?? null,
  },

  mergeable: {
    external: (external) => external.mergeable ?? null,
    domain: (domain) => domain.mergeable,
    dataTarget: (dataTarget) => dataTarget.mergeable ?? null,
  },

  maintainerCanModify: {
    external: (external) => external.maintainer_can_modify ?? false,
    domain: (domain) => domain.maintainerCanModify,
    dataTarget: (dataTarget) => dataTarget.maintainerCanModify ?? false,
  },

  // JSONB fields for complex objects
  userData: {
    external: (external) => (external.user ? ({ ...external.user } as Record<string, unknown>) : null),
    domain: (domain) => domain.userData,
    dataTarget: (dataTarget) => (dataTarget.userData as Record<string, unknown> | null) ?? null,
  },

  assigneeData: {
    external: (external) => (external.assignee ? ({ ...external.assignee } as Record<string, unknown>) : null),
    domain: (domain) => domain.assigneeData,
    dataTarget: (dataTarget) => (dataTarget.assigneeData as Record<string, unknown> | null) ?? null,
  },

  assigneesData: {
    external: (external) =>
      external.assignees && external.assignees.length > 0
        ? (external.assignees.map((a) => ({ ...a })) as unknown as Record<string, unknown>)
        : null,
    domain: (domain) => domain.assigneesData,
    dataTarget: (dataTarget) => (dataTarget.assigneesData as Record<string, unknown> | null) ?? null,
  },

  mergedByData: {
    external: (external) => (external.merged_by ? ({ ...external.merged_by } as Record<string, unknown>) : null),
    domain: (domain) => domain.mergedByData,
    dataTarget: (dataTarget) => (dataTarget.mergedByData as Record<string, unknown> | null) ?? null,
  },

  labels: {
    external: (external) =>
      external.labels && external.labels.length > 0
        ? (external.labels.map((label) => ({ ...label })) as Record<string, unknown>[])
        : null,
    domain: (domain) => domain.labels,
    dataTarget: (dataTarget) => (dataTarget.labels as Record<string, unknown>[] | null) ?? null,
  },

  milestoneData: {
    external: (external) => (external.milestone ? ({ ...external.milestone } as Record<string, unknown>) : null),
    domain: (domain) => domain.milestoneData,
    dataTarget: (dataTarget) => (dataTarget.milestoneData as Record<string, unknown> | null) ?? null,
  },

  requestedReviewersData: {
    external: (external) =>
      external.requested_reviewers && external.requested_reviewers.length > 0
        ? (external.requested_reviewers.map((r) => ({ ...r })) as unknown as Record<string, unknown>)
        : null,
    domain: (domain) => domain.requestedReviewersData,
    dataTarget: (dataTarget) => (dataTarget.requestedReviewersData as Record<string, unknown> | null) ?? null,
  },

  __type: {
    external: () => "pull_request" as const,
    domain: (domain) => domain.__type,
    dataTarget: () => "pull_request" as const,
  },
};

const domainDefaults = { __type: "pull_request" as const };

export const connectorGithubPullRequestMapper = new ConnectorMapper<
  GitHubPullRequestExternal,
  GitHubPullRequestEntity,
  GitHubPullRequestDataTarget
>(githubPullRequestMapping, domainDefaults);
