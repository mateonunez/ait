import type { SlackMessageDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";
import type { ConnectorMapperDefinition } from "../../../types/domain/mappers/connector.mapper.interface";
import type { SlackMessageEntity, SlackMessageExternal } from "@ait/core";

const slackMessageMapping: ConnectorMapperDefinition<SlackMessageExternal, SlackMessageEntity, SlackMessageDataTarget> =
  {
    id: {
      external: (external) => `${external.channel || ""}_${external.ts}`,
      domain: (domain) => domain.id,
      dataTarget: (dataTarget) => dataTarget.id,
    },

    channelId: {
      external: (external) => external.channel || "",
      domain: (domain) => domain.channelId,
      dataTarget: (dataTarget) => dataTarget.channelId,
    },

    channelName: connectorMapperPassThrough<
      "channelName",
      string,
      SlackMessageExternal,
      SlackMessageEntity,
      SlackMessageDataTarget
    >("channelName"),

    text: connectorMapperPassThrough<"text", string, SlackMessageExternal, SlackMessageEntity, SlackMessageDataTarget>(
      "text",
    ),

    userId: {
      external: (external) => external.user || null,
      domain: (domain) => domain.userId,
      dataTarget: (dataTarget) => dataTarget.userId ?? null,
    },

    userName: {
      external: (external) => external.userName || null,
      domain: (domain) => domain.userName,
      dataTarget: (dataTarget) => dataTarget.userName ?? null,
    },

    threadTs: {
      external: (external) => external.thread_ts || null,
      domain: (domain) => domain.threadTs,
      dataTarget: (dataTarget) => dataTarget.threadTs ?? null,
    },

    replyCount: {
      external: (external) => external.reply_count || 0,
      domain: (domain) => domain.replyCount,
      dataTarget: (dataTarget) => dataTarget.replyCount ?? 0,
    },

    permalink: {
      external: (external) => external.permalink || null,
      domain: (domain) => domain.permalink,
      dataTarget: (dataTarget) => dataTarget.permalink ?? null,
    },

    files: {
      external: (external) => external.files || [],
      domain: (domain) => domain.files,
      dataTarget: (dataTarget) => (dataTarget.files as any) || [],
    },

    attachments: {
      external: (external) => external.attachments || [],
      domain: (domain) => domain.attachments,
      dataTarget: (dataTarget) => (dataTarget.attachments as any) || [],
    },

    reactions: {
      external: (external) => external.reactions || [],
      domain: (domain) => domain.reactions,
      dataTarget: (dataTarget) => (dataTarget.reactions as any) || [],
    },

    edited: {
      external: (external) => external.edited || null,
      domain: (domain) => domain.edited,
      dataTarget: (dataTarget) => (dataTarget.edited as any) ?? null,
    },

    pinnedTo: {
      external: (external) => external.pinned_to || [],
      domain: (domain) => domain.pinnedTo,
      dataTarget: (dataTarget) => (dataTarget.pinnedTo as any) || [],
    },

    ts: connectorMapperPassThrough<"ts", string, SlackMessageExternal, SlackMessageEntity, SlackMessageDataTarget>(
      "ts",
    ),

    createdAt: {
      external: (external) => new Date(Number.parseFloat(external.ts) * 1000),
      domain: (domain) => domain.createdAt,
      dataTarget: (dataTarget) => dataTarget.createdAt ?? new Date(),
    },

    updatedAt: {
      external: (external) => new Date(Number.parseFloat(external.ts) * 1000),
      domain: (domain) => domain.updatedAt,
      dataTarget: (dataTarget) => dataTarget.updatedAt ?? new Date(),
    },

    __type: {
      external: () => "message" as const,
      domain: (domain) => domain.__type,
      dataTarget: () => "message" as const,
    },
  };

const domainDefaults = { __type: "message" as const };

export const connectorSlackMessageMapper = new ConnectorMapper<
  SlackMessageExternal,
  SlackMessageEntity,
  SlackMessageDataTarget
>(slackMessageMapping, domainDefaults);
