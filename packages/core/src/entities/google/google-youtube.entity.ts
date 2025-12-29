import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { GoogleYouTubeSubscriptionExternal } from "../../types/integrations";

/**
 * Google YouTube Subscription entity with class-transformer decorators.
 */
export class GoogleYouTubeSubscriptionEntity {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  description!: string | null;

  @Expose()
  channelId!: string;

  @Expose()
  resourceChannelId!: string;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : new Date()))
  publishedAt!: Date;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  thumbnailUrl!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? 0)
  totalItemCount!: number;

  @Expose()
  @Transform(({ value }: any) => value ?? 0)
  newItemCount!: number;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  activityType!: string | null;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "google_youtube_subscription" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): GoogleYouTubeSubscriptionEntity {
    return plainToInstance(GoogleYouTubeSubscriptionEntity, data, { excludeExtraneousValues: false });
  }
}

/**
 * Transform external YouTube response to domain entity.
 */
export function mapGoogleYouTubeSubscription(
  external: GoogleYouTubeSubscriptionExternal,
): GoogleYouTubeSubscriptionEntity {
  const mapped = {
    ...external,
    title: external.snippet?.title ?? "Untitled Subscription",
    description: external.snippet?.description ?? null,
    channelId: external.snippet?.channelId ?? "",
    resourceChannelId: external.snippet?.resourceId?.channelId ?? "",
    publishedAt: external.snippet?.publishedAt ?? new Date().toISOString(),
    thumbnailUrl:
      external.snippet?.thumbnails?.high?.url ??
      external.snippet?.thumbnails?.medium?.url ??
      external.snippet?.thumbnails?.default?.url ??
      null,
    totalItemCount: external.contentDetails?.totalItemCount ?? 0,
    newItemCount: external.contentDetails?.newItemCount ?? 0,
    activityType: external.contentDetails?.activityType ?? null,
  };

  return plainToInstance(GoogleYouTubeSubscriptionEntity, mapped, {
    excludeExtraneousValues: true,
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapGoogleYouTubeSubscriptions(
  externals: GoogleYouTubeSubscriptionExternal[],
): GoogleYouTubeSubscriptionEntity[] {
  return externals.map(mapGoogleYouTubeSubscription);
}
