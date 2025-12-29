import { getAIDescriptorService } from "@ait/ai-sdk";
import type { GoogleSubscriptionDataTarget } from "@ait/postgres";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

const aiDescriptor = getAIDescriptorService();

export class ETLGoogleYouTubeSubscriptionDescriptor implements IETLEmbeddingDescriptor<GoogleSubscriptionDataTarget> {
  public async enrich(subscription: GoogleSubscriptionDataTarget, options?: any): Promise<EnrichmentResult | null> {
    const context = `YouTube Subscription: ${subscription.title}`;
    const content = subscription.description || `A subscription to ${subscription.title} channel.`;

    return aiDescriptor.describeText(content, context, { correlationId: options?.correlationId });
  }

  public getEmbeddingText(enriched: EnrichedEntity<GoogleSubscriptionDataTarget>): string {
    const { target: subscription, enrichment } = enriched;
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

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(
    enriched: EnrichedEntity<GoogleSubscriptionDataTarget>,
  ): U {
    const { target: entity } = enriched;
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
