import type { XTweetDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";
import type { XTweetExternal, XTweetEntity } from "@ait/core";
import type { ConnectorMapperDefinition } from "../../../types/domain/mappers/connector.mapper.interface";

const xTweetMapping: ConnectorMapperDefinition<XTweetExternal, XTweetEntity, XTweetDataTarget> = {
  id: connectorMapperPassThrough<"id", string, XTweetExternal, XTweetEntity, XTweetDataTarget>("id"),

  text: connectorMapperPassThrough<"text", string, XTweetExternal, XTweetEntity, XTweetDataTarget>("text"),

  authorId: {
    external: (external) => external.author_id ?? "",
    domain: (domain) => domain.authorId,
    dataTarget: (dataTarget) => dataTarget.authorId,
  },

  authorUsername: {
    external: (external) => external.username ?? null,
    domain: (domain) => domain.authorUsername,
    dataTarget: (dataTarget) => dataTarget.authorUsername ?? null,
  },

  authorName: {
    external: (external) => external.name ?? null,
    domain: (domain) => domain.authorName,
    dataTarget: (dataTarget) => dataTarget.authorName ?? null,
  },

  lang: connectorMapperPassThrough<"lang", string | null | undefined, XTweetExternal, XTweetEntity, XTweetDataTarget>(
    "lang",
    {
      external: {
        fallback: () => "en",
      },
      domain: {
        fallback: () => "en",
      },
    },
  ),
  jsonData: {
    external: (external) => external.entities ?? {},
    domain: (domain) => domain.jsonData,
    dataTarget: (dataTarget) => dataTarget.jsonData ?? {},
  },

  retweetCount: {
    external: (external) => external.public_metrics?.retweet_count ?? 0,
    domain: (domain) => domain.retweetCount,
    dataTarget: (dataTarget) => dataTarget.retweetCount ?? 0,
  },

  likeCount: {
    external: (external) => external.public_metrics?.like_count ?? 0,
    domain: (domain) => domain.likeCount,
    dataTarget: (dataTarget) => dataTarget.likeCount ?? 0,
  },

  replyCount: {
    external: (external) => external.public_metrics?.reply_count ?? 0,
    domain: (domain) => domain.replyCount,
    dataTarget: (dataTarget) => dataTarget.replyCount ?? 0,
  },

  quoteCount: {
    external: (external) => external.public_metrics?.quote_count ?? 0,
    domain: (domain) => domain.quoteCount,
    dataTarget: (dataTarget) => dataTarget.quoteCount ?? 0,
  },

  conversationId: {
    external: (external) => external.conversation_id ?? null,
    domain: (domain) => domain.conversationId ?? null,
    dataTarget: (dataTarget) => dataTarget.conversationId ?? null,
  },

  inReplyToUserId: {
    external: (external) => external.in_reply_to_user_id ?? null,
    domain: (domain) => domain.inReplyToUserId ?? null,
    dataTarget: (dataTarget) => dataTarget.inReplyToUserId ?? null,
  },

  mediaAttachments: {
    external: (external) => external.media ?? null,
    domain: (domain) => domain.mediaAttachments ?? null,
    dataTarget: (dataTarget) => dataTarget.mediaAttachments ?? null,
  },

  pollData: {
    external: (external) => external.poll ?? null,
    domain: (domain) => domain.pollData ?? null,
    dataTarget: (dataTarget) => dataTarget.pollData ?? null,
  },

  placeData: {
    external: (external) => external.place ?? null,
    domain: (domain) => domain.placeData ?? null,
    dataTarget: (dataTarget) => dataTarget.placeData ?? null,
  },

  createdAt: {
    external: (external) => new Date(external.created_at ?? ""),
    domain: (domain) => domain.createdAt,
    dataTarget: (dataTarget) => dataTarget.createdAt ?? new Date(),
  },

  updatedAt: {
    external: () => new Date(), // X API doesn't provide updated_at
    domain: (domain) => domain.updatedAt,
    dataTarget: (dataTarget) => dataTarget.updatedAt ?? new Date(),
  },

  __type: {
    external: () => "tweet" as const,
    domain: (domain) => domain.__type,
    dataTarget: () => "tweet" as const,
  },
};

const domainDefaults = { __type: "tweet" as const };

export const connectorXTweetMapper = new ConnectorMapper<XTweetExternal, XTweetEntity, XTweetDataTarget>(
  xTweetMapping,
  domainDefaults,
);
