import "reflect-metadata";
import type { SlackMessageExternal } from "@ait/core";
import type { SlackMessageDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Slack Message entity with class-transformer decorators.
 */
export class SlackMessageEntity {
  @Expose()
  id!: string;

  @Expose()
  channelId!: string;

  @Expose()
  channelName!: string;

  @Expose()
  text!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  userId!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  userName!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  threadTs!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  replyCount!: number;

  @Expose()
  @Transform(({ value }) => value ?? null)
  permalink!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? [])
  files!: any[];

  @Expose()
  @Transform(({ value }) => value ?? [])
  attachments!: any[];

  @Expose()
  @Transform(({ value }) => value ?? [])
  reactions!: any[];

  @Expose()
  @Transform(({ value }) => value ?? null)
  edited!: { user?: string; ts?: string } | null;

  @Expose()
  @Transform(({ value }) => value ?? [])
  pinnedTo!: string[];

  @Expose()
  ts!: string;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "message" as const;
}

/**
 * Transform external Slack API response to domain entity.
 */
export function mapSlackMessage(external: SlackMessageExternal): SlackMessageEntity {
  const mapped = {
    ...external,
    id: `${external.channel ?? ""}-${external.ts}`,
    channelId: external.channel ?? "",
    channelName: external.channelName ?? "",
    userId: external.user ?? null,
    userName: external.userName ?? null,
    threadTs: external.thread_ts ?? null,
    replyCount: external.reply_count ?? 0,
    pinnedTo: external.pinned_to ?? [],
  };

  return plainToInstance(SlackMessageEntity, mapped, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapSlackMessages(externals: SlackMessageExternal[]): SlackMessageEntity[] {
  return externals.map(mapSlackMessage);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function slackMessageDomainToDataTarget(domain: SlackMessageEntity): SlackMessageDataTarget {
  return instanceToPlain(domain) as SlackMessageDataTarget;
}

export function slackMessageDataTargetToDomain(dataTarget: SlackMessageDataTarget): SlackMessageEntity {
  return plainToInstance(SlackMessageEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
