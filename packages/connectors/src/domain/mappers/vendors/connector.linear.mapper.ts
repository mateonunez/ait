import type { LinearIssueDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";
import type { ConnectorMapperDefinition } from "../../../types/domain/mappers/connector.mapper.interface";
import type { LinearIssueEntity, LinearIssueExternal } from "@ait/core";

const linearIssueMapping: ConnectorMapperDefinition<LinearIssueExternal, LinearIssueEntity, LinearIssueDataTarget> = {
  id: connectorMapperPassThrough<"id", string, LinearIssueExternal, LinearIssueEntity, LinearIssueDataTarget>("id"),

  title: connectorMapperPassThrough<"title", string, LinearIssueExternal, LinearIssueEntity, LinearIssueDataTarget>(
    "title",
  ),

  description: {
    external: (external) => external.description ?? null,
    domain: (domain) => domain.description,
    dataTarget: (dataTarget) => dataTarget.description!,
  },

  state: {
    external: (external) => external.state.name,
    domain: (domain) => domain.state,
    dataTarget: (dataTarget) => dataTarget.state,
  },

  priority: connectorMapperPassThrough<
    "priority",
    number | null,
    LinearIssueExternal,
    LinearIssueEntity,
    LinearIssueDataTarget
  >("priority", {
    external: {
      fallback: () => null,
    },
  }),

  assigneeId: {
    external: (external) => external.assignee?.id ?? null,
    domain: (domain) => domain.assigneeId,
    dataTarget: (dataTarget) => dataTarget.assigneeId!,
  },

  assigneeName: {
    external: (external) => external.assignee?.name ?? null,
    domain: (domain) => domain.assigneeName,
    dataTarget: (dataTarget) => dataTarget.assigneeName ?? null,
  },

  teamId: {
    external: (external) => external.team.id,
    domain: (domain) => domain.teamId,
    dataTarget: (dataTarget) => dataTarget.teamId,
  },

  teamName: {
    external: (external) => external.team.name ?? null,
    domain: (domain) => domain.teamName,
    dataTarget: (dataTarget) => dataTarget.teamName ?? null,
  },

  projectId: {
    external: (external) => external.project?.id ?? null,
    domain: (domain) => domain.projectId,
    dataTarget: (dataTarget) => dataTarget.projectId!,
  },

  projectName: {
    external: (external) => external.project?.name ?? null,
    domain: (domain) => domain.projectName,
    dataTarget: (dataTarget) => dataTarget.projectName ?? null,
  },

  url: connectorMapperPassThrough<"url", string, LinearIssueExternal, LinearIssueEntity, LinearIssueDataTarget>("url"),

  labels: {
    external: (external: LinearIssueExternal) => external.labels.nodes.map((l) => l.name),
    domain: (domain: LinearIssueEntity) => domain.labels,
    dataTarget: (dataTarget: LinearIssueDataTarget) => dataTarget.labels ?? [],
  },

  createdAt: {
    external: (external) => new Date(external.createdAt),
    domain: (domain) => domain.createdAt,
    dataTarget: (dataTarget) => dataTarget.createdAt ?? new Date(),
  },

  updatedAt: {
    external: (external) => new Date(external.updatedAt),
    domain: (domain) => domain.updatedAt,
    dataTarget: (dataTarget) => dataTarget.updatedAt ?? new Date(),
  },

  __type: {
    external: () => "issue" as const,
    domain: (domain) => domain.__type,
    dataTarget: () => "issue" as const,
  },
};

const domainDefaults = { __type: "issue" as const };

export const connectorLinearIssueMapper = new ConnectorMapper<
  LinearIssueExternal,
  LinearIssueEntity,
  LinearIssueDataTarget
>(linearIssueMapping, domainDefaults);
