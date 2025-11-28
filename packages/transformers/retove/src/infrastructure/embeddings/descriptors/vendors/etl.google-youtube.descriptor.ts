import type { GoogleSubscriptionDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";

export class ETLGoogleYouTubeSubscriptionDescriptor implements IETLEmbeddingDescriptor<GoogleSubscriptionDataTarget> {
  public getEmbeddingText(subscription: GoogleSubscriptionDataTarget): string {
    const parts: string[] = [];

    parts.push("YouTube Subscription");

    if (subscription.title) {
      const sanitizedTitle = TextSanitizer.sanitize(subscription.title);
      parts.push(`"${sanitizedTitle}"`);
    }

    if (subscription.description) {
      const sanitizedDesc = TextSanitizer.sanitize(subscription.description);
      const descPreview = sanitizedDesc.length > 300 ? `${sanitizedDesc.slice(0, 300)}...` : sanitizedDesc;
      parts.push(`Description: ${descPreview}`);
    }

    if (subscription.channelId) {
      parts.push(`Channel ID: ${subscription.channelId}`);
    }

    if (subscription.publishedAt) {
      const date = new Date(subscription.publishedAt);
      parts.push(`Subscribed on ${date.toLocaleDateString("en-US")}`);
    }

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: GoogleSubscriptionDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      title: entityWithoutInternalTimestamps.title
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.title, 500)
        : "",
      description: entityWithoutInternalTimestamps.description
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.description, 2000)
        : null,
    };

    return {
      __type: "subscription",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const googleYouTubeDescriptorsETL = {
  subscription: new ETLGoogleYouTubeSubscriptionDescriptor(),
};
