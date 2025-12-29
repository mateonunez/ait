import "reflect-metadata";
import type { XTweetExternal } from "@ait/core";
import type { XTweetDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * X (Twitter) Tweet entity with class-transformer decorators.
 */
export class XTweetEntity {
  @Expose()
  id!: string;

  @Expose()
  text!: string;

  @Expose()
  authorId!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  authorUsername!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  authorName!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? "en")
  lang = "en";

  @Expose()
  @Transform(({ value }) => value ?? 0)
  retweetCount = 0;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  likeCount = 0;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  replyCount = 0;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  quoteCount = 0;

  @Expose()
  @Transform(({ value }) => value ?? null)
  conversationId: string | null = null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  inReplyToUserId: string | null = null;

  @Expose()
  @Transform(({ value }) => value ?? [])
  mediaAttachments: any[] = [];

  @Expose()
  @Transform(({ value }) => value ?? null)
  pollData: any = null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  placeData: any = null;

  @Expose()
  @Transform(({ value }) => value ?? {})
  jsonData: Record<string, unknown> = {};

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "tweet" as const;
}

/**
 * Transform external X API response to domain entity.
 */
export function mapXTweet(external: XTweetExternal): XTweetEntity {
  const mapped = {
    ...external,
    authorId: external.author_id ?? "",
    authorUsername: external.username ?? null,
    authorName: external.name ?? null,
    retweetCount: external.public_metrics?.retweet_count ?? 0,
    likeCount: external.public_metrics?.like_count ?? 0,
    replyCount: external.public_metrics?.reply_count ?? 0,
    quoteCount: external.public_metrics?.quote_count ?? 0,
    conversationId: external.conversation_id ?? null,
    inReplyToUserId: external.in_reply_to_user_id ?? null,
    mediaAttachments: external.media ?? [],
    pollData: external.poll ?? null,
    placeData: external.place ?? null,
    createdAt: external.created_at,
    jsonData: external,
  };

  return plainToInstance(XTweetEntity, mapped, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapXTweets(externals: XTweetExternal[]): XTweetEntity[] {
  return externals.map(mapXTweet);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function xTweetDomainToDataTarget(domain: XTweetEntity): XTweetDataTarget {
  return instanceToPlain(domain) as XTweetDataTarget;
}

export function xTweetDataTargetToDomain(dataTarget: XTweetDataTarget): XTweetEntity {
  return plainToInstance(XTweetEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
