import "reflect-metadata";
import { Expose, Type, instanceToPlain, plainToInstance } from "class-transformer";
import type { SlackMessageExternal } from "../../types/integrations";

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
  @Type(() => String)
  userId!: string | null;

  @Expose()
  @Type(() => String)
  userName!: string | null;

  @Expose()
  @Type(() => String)
  threadTs!: string | null;

  @Expose()
  @Type(() => Number)
  replyCount!: number;

  @Expose()
  @Type(() => String)
  permalink!: string | null;

  @Expose()
  @Type(() => Array)
  files!: any[];

  @Expose()
  @Type(() => Array)
  attachments!: any[];

  @Expose()
  @Type(() => Array)
  reactions!: any[];

  @Expose()
  @Type(() => Object)
  edited!: { user?: string; ts?: string } | null;

  @Expose()
  @Type(() => Array)
  pinnedTo!: string[];

  @Expose()
  ts!: string;

  @Expose()
  @Type(() => Date)
  createdAt!: Date;

  @Expose()
  @Type(() => Date)
  updatedAt!: Date;

  @Expose()
  readonly __type = "slack_message" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): SlackMessageEntity {
    return plainToInstance(SlackMessageEntity, data, { excludeExtraneousValues: false });
  }
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
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapSlackMessages(externals: SlackMessageExternal[]): SlackMessageEntity[] {
  return externals.map(mapSlackMessage);
}
