import type { GitHubRepositoryDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";
import type {
  GitHubRepositoryExternal,
  GitHubRepositoryEntity,
} from "../../../types/domain/entities/vendors/connector.github.repository.types";
import type { ConnectorMapperDefinition } from "../../../types/domain/mappers/connector.mapper.interface";

const githubRepositoryMapping: ConnectorMapperDefinition<
  GitHubRepositoryExternal,
  GitHubRepositoryEntity,
  GitHubRepositoryDataTarget
> = {
  id: {
    external: (external) => external.id.toString(),
    domain: (domain) => domain.id,
    dataTarget: (dataTarget) => dataTarget.id,
  },

  name: connectorMapperPassThrough<
    "name",
    string,
    GitHubRepositoryExternal,
    GitHubRepositoryEntity,
    GitHubRepositoryDataTarget
  >("name"),

  description: connectorMapperPassThrough<
    "description",
    string | null,
    GitHubRepositoryExternal,
    GitHubRepositoryEntity,
    GitHubRepositoryDataTarget
  >("description"),

  stars: {
    external: (external) => external.stargazers_count,
    domain: (domain) => domain.stars,
    dataTarget: (dataTarget) => dataTarget.stars,
  },

  forks: connectorMapperPassThrough<
    "forks",
    number,
    GitHubRepositoryExternal,
    GitHubRepositoryEntity,
    GitHubRepositoryDataTarget
  >("forks"),

  url: connectorMapperPassThrough<
    "url",
    string,
    GitHubRepositoryExternal,
    GitHubRepositoryEntity,
    GitHubRepositoryDataTarget
  >("url"),

  language: connectorMapperPassThrough<
    "language",
    string | null,
    GitHubRepositoryExternal,
    GitHubRepositoryEntity,
    GitHubRepositoryDataTarget
  >("language"),

  fullName: {
    external: (external) => external.full_name ?? "",
    domain: (domain) => domain.fullName,
    dataTarget: (dataTarget) => dataTarget.fullName ?? "",
  },

  private: {
    external: (external) => external.private ?? false,
    domain: (domain) => domain.private,
    dataTarget: (dataTarget) => dataTarget.private ?? false,
  },

  fork: {
    external: (external) => external.fork ?? false,
    domain: (domain) => domain.fork,
    dataTarget: (dataTarget) => dataTarget.fork ?? false,
  },

  archived: {
    external: (external) => external.archived ?? false,
    domain: (domain) => domain.archived,
    dataTarget: (dataTarget) => dataTarget.archived ?? false,
  },

  disabled: {
    external: (external) => external.disabled ?? false,
    domain: (domain) => domain.disabled,
    dataTarget: (dataTarget) => dataTarget.disabled ?? false,
  },

  visibility: {
    external: (external) => external.visibility ?? "public",
    domain: (domain) => domain.visibility,
    dataTarget: (dataTarget) => dataTarget.visibility ?? "public",
  },

  watchersCount: {
    external: (external) => external.watchers_count ?? 0,
    domain: (domain) => domain.watchersCount,
    dataTarget: (dataTarget) => dataTarget.watchersCount ?? 0,
  },

  openIssuesCount: {
    external: (external) => external.open_issues_count ?? 0,
    domain: (domain) => domain.openIssuesCount,
    dataTarget: (dataTarget) => dataTarget.openIssuesCount ?? 0,
  },

  size: {
    external: (external) => external.size ?? 0,
    domain: (domain) => domain.size,
    dataTarget: (dataTarget) => dataTarget.size ?? 0,
  },

  defaultBranch: {
    external: (external) => external.default_branch ?? "main",
    domain: (domain) => domain.defaultBranch,
    dataTarget: (dataTarget) => dataTarget.defaultBranch ?? "main",
  },

  topics: {
    external: (external) => external.topics ?? [],
    domain: (domain) => domain.topics,
    dataTarget: (dataTarget) => dataTarget.topics ?? [],
  },

  isTemplate: {
    external: (external) => external.is_template ?? false,
    domain: (domain) => domain.isTemplate,
    dataTarget: (dataTarget) => dataTarget.isTemplate ?? false,
  },

  hasIssues: {
    external: (external) => external.has_issues ?? true,
    domain: (domain) => domain.hasIssues,
    dataTarget: (dataTarget) => dataTarget.hasIssues ?? true,
  },

  hasProjects: {
    external: (external) => external.has_projects ?? true,
    domain: (domain) => domain.hasProjects,
    dataTarget: (dataTarget) => dataTarget.hasProjects ?? true,
  },

  hasWiki: {
    external: (external) => external.has_wiki ?? true,
    domain: (domain) => domain.hasWiki,
    dataTarget: (dataTarget) => dataTarget.hasWiki ?? true,
  },

  hasPages: {
    external: (external) => external.has_pages ?? false,
    domain: (domain) => domain.hasPages,
    dataTarget: (dataTarget) => dataTarget.hasPages ?? false,
  },

  hasDiscussions: {
    external: (external) => external.has_discussions ?? false,
    domain: (domain) => domain.hasDiscussions,
    dataTarget: (dataTarget) => dataTarget.hasDiscussions ?? false,
  },

  homepage: {
    external: (external) => external.homepage ?? null,
    domain: (domain) => domain.homepage,
    dataTarget: (dataTarget) => dataTarget.homepage ?? null,
  },

  pushedAt: {
    external: (external) => (external.pushed_at ? new Date(external.pushed_at) : null),
    domain: (domain) => domain.pushedAt,
    dataTarget: (dataTarget) => dataTarget.pushedAt ?? null,
  },

  licenseName: {
    external: (external) => external.license?.name ?? null,
    domain: (domain) => domain.licenseName,
    dataTarget: (dataTarget) => dataTarget.licenseName ?? null,
  },

  cloneUrl: {
    external: (external) => external.clone_url ?? "",
    domain: (domain) => domain.cloneUrl,
    dataTarget: (dataTarget) => dataTarget.cloneUrl ?? "",
  },

  sshUrl: {
    external: (external) => external.ssh_url ?? "",
    domain: (domain) => domain.sshUrl,
    dataTarget: (dataTarget) => dataTarget.sshUrl ?? "",
  },

  // JSONB fields for complex objects
  ownerData: {
    external: (external) => (external.owner ? ({ ...external.owner } as Record<string, unknown>) : null),
    domain: (domain) => domain.ownerData,
    dataTarget: (dataTarget) => (dataTarget.ownerData as Record<string, unknown> | null) ?? null,
  },

  licenseData: {
    external: (external) => (external.license ? ({ ...external.license } as Record<string, unknown>) : null),
    domain: (domain) => domain.licenseData,
    dataTarget: (dataTarget) => (dataTarget.licenseData as Record<string, unknown> | null) ?? null,
  },

  metadata: {
    external: (external) => {
      const metadata: Record<string, unknown> = {};
      if (external.html_url) metadata.html_url = external.html_url;
      if (external.git_url) metadata.git_url = external.git_url;
      if (external.svn_url) metadata.svn_url = external.svn_url;
      if (external.mirror_url) metadata.mirror_url = external.mirror_url;
      if (external.node_id) metadata.node_id = external.node_id;
      return Object.keys(metadata).length > 0 ? metadata : null;
    },
    domain: (domain) => domain.metadata,
    dataTarget: (dataTarget) => (dataTarget.metadata as Record<string, unknown> | null) ?? null,
  },

  __type: {
    external: () => "repository" as const,
    domain: (domain) => domain.__type,
    dataTarget: () => "repository" as const,
  },
};

const domainDefaults = { __type: "repository" as const };

export const connectorGithubRepositoryMapper = new ConnectorMapper<
  GitHubRepositoryExternal,
  GitHubRepositoryEntity,
  GitHubRepositoryDataTarget
>(githubRepositoryMapping, domainDefaults);
