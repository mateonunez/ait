import type { XTweetDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";
import type { XTweetExternal, XTweetEntity } from "@/types/domain/entities/vendors/connector.x.repository.types";
import type { ConnectorMapperDefinition } from "@/types/domain/mappers/connector.mapper.interface";

const xTweetMapping: ConnectorMapperDefinition<XTweetExternal, XTweetEntity, XTweetDataTarget> = {
  id: connectorMapperPassThrough<"id", string, XTweetExternal, XTweetEntity, XTweetDataTarget>("id"),

  text: connectorMapperPassThrough<"text", string, XTweetExternal, XTweetEntity, XTweetDataTarget>("text"),

  authorId: {
    external: (external) => external.author_id ?? "",
    domain: (domain) => domain.authorId,
    dataTarget: (dataTarget) => dataTarget.authorId,
  },

  lang: connectorMapperPassThrough<"lang", string | null | undefined, XTweetExternal, XTweetEntity, XTweetDataTarget>(
    "lang",
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
