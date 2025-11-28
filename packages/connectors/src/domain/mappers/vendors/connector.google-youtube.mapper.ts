import type { GoogleYouTubeSubscriptionExternal, GoogleYouTubeSubscriptionEntity } from "@ait/core";
import type { GoogleSubscriptionDataTarget, GoogleSubscriptionDataTargetInsert } from "@ait/postgres";

class ConnectorGoogleYouTubeSubscriptionMapper {
  externalToDomain(external: GoogleYouTubeSubscriptionExternal): GoogleYouTubeSubscriptionEntity {
    return {
      id: external.id,
      title: external.snippet.title,
      description: external.snippet.description,
      channelId: external.snippet.channelId,
      resourceChannelId: external.snippet.resourceId.channelId,
      publishedAt: external.snippet.publishedAt,
      thumbnailUrl:
        external.snippet.thumbnails.high.url ||
        external.snippet.thumbnails.medium.url ||
        external.snippet.thumbnails.default.url,
      totalItemCount: external.contentDetails.totalItemCount,
      newItemCount: external.contentDetails.newItemCount,
      activityType: external.contentDetails.activityType,
      __type: "subscription",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  domainToDataTarget(domain: Partial<GoogleYouTubeSubscriptionEntity>): GoogleSubscriptionDataTargetInsert {
    return {
      id: domain.id!,
      title: domain.title!,
      description: domain.description,
      channelId: domain.channelId!,
      resourceChannelId: domain.resourceChannelId!,
      publishedAt: new Date(domain.publishedAt!),
      thumbnailUrl: domain.thumbnailUrl,
      totalItemCount: domain.totalItemCount || 0,
      newItemCount: domain.newItemCount || 0,
      activityType: domain.activityType,
    };
  }

  dataTargetToDomain(target: GoogleSubscriptionDataTarget): GoogleYouTubeSubscriptionEntity {
    return {
      id: target.id,
      title: target.title,
      description: target.description,
      channelId: target.channelId,
      resourceChannelId: target.resourceChannelId,
      publishedAt: target.publishedAt.toISOString(),
      thumbnailUrl: target.thumbnailUrl,
      totalItemCount: target.totalItemCount,
      newItemCount: target.newItemCount,
      activityType: target.activityType,
      __type: "subscription",
      createdAt: target.createdAt?.toISOString() || null,
      updatedAt: target.updatedAt?.toISOString() || null,
    };
  }
}

export const connectorGoogleYouTubeSubscriptionMapper = new ConnectorGoogleYouTubeSubscriptionMapper();
