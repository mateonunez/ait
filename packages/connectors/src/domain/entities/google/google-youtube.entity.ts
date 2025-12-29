import "reflect-metadata";
import type { GoogleYouTubeSubscriptionExternal } from "@ait/core";
import type { GoogleSubscriptionDataTargetInsert } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Google YouTube Subscription entity with class-transformer decorators.
 */
export class GoogleYouTubeSubscriptionEntity {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  description!: string | null;

  @Expose()
  channelId!: string;

  @Expose()
  resourceChannelId!: string;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  publishedAt!: Date;

  @Expose()
  @Transform(({ value }) => value ?? null)
  thumbnailUrl!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  totalItemCount!: number;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  newItemCount!: number;

  @Expose()
  @Transform(({ value }) => value ?? null)
  activityType!: string | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "subscription" as const;
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

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function googleYouTubeSubscriptionDomainToDataTarget(
  domain: GoogleYouTubeSubscriptionEntity,
): GoogleSubscriptionDataTargetInsert {
  return instanceToPlain(domain) as GoogleSubscriptionDataTargetInsert;
}

export function googleYouTubeSubscriptionDataTargetToDomain(
  dataTarget: GoogleSubscriptionDataTargetInsert,
): GoogleYouTubeSubscriptionEntity {
  return plainToInstance(GoogleYouTubeSubscriptionEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
