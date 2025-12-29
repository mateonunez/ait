import { getAIDescriptorService } from "@ait/ai-sdk";
import type { XTweetDataTarget } from "@ait/postgres";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

const aiDescriptor = getAIDescriptorService();

export class ETLXTweetDescriptor implements IETLEmbeddingDescriptor<XTweetDataTarget> {
  public async enrich(tweet: XTweetDataTarget, options?: any): Promise<EnrichmentResult | null> {
    const context = `Tweet by @${tweet.authorUsername || "unknown"}`;
    const content = tweet.text || "Empty tweet";

    return aiDescriptor.describeText(content, context, { correlationId: options?.correlationId });
  }

  public getEmbeddingText(enriched: EnrichedEntity<XTweetDataTarget>): string {
    const { target: tweet, enrichment } = enriched;
    const parts: string[] = [];

    // Tweet identity - factual, third-person description
    const author = tweet.authorUsername ? `@${tweet.authorUsername}` : "unknown";
    const sanitizedText = TextSanitizer.sanitize(tweet.text, 280);
    parts.push(`Tweet by ${author}: "${sanitizedText}"`);

    // Add media context
    if (tweet.mediaAttachments && Array.isArray(tweet.mediaAttachments) && tweet.mediaAttachments.length > 0) {
      const mediaTypes = tweet.mediaAttachments.map((m: any) => m.type);
      const photoCount = mediaTypes.filter((t) => t === "google_photo").length;
      const videoCount = mediaTypes.filter((t) => t === "video").length;
      const gifCount = mediaTypes.filter((t) => t === "animated_gif").length;

      const mediaParts: string[] = [];
      if (photoCount > 0) mediaParts.push(`${photoCount} photo${photoCount > 1 ? "s" : ""}`);
      if (videoCount > 0) mediaParts.push(`${videoCount} video${videoCount > 1 ? "s" : ""}`);
      if (gifCount > 0) mediaParts.push("GIF");

      if (mediaParts.length > 0) {
        parts.push(`with ${mediaParts.join(", ")}`);
      }
    }

    // Add poll context
    if (tweet.pollData) {
      const poll = tweet.pollData as any;
      if (poll.options && Array.isArray(poll.options)) {
        const optionCount = poll.options.length;
        const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0);
        parts.push(`poll (${optionCount} options${totalVotes > 0 ? `, ${totalVotes} votes` : ""})`);
      }
    }

    // Add location context
    if (tweet.placeData) {
      const place = tweet.placeData as any;
      const placeName = place.full_name || place.name;
      if (placeName) {
        parts.push(`from ${placeName}`);
      }
    }

    // Build engagement stats
    const stats: string[] = [];
    if (tweet.retweetCount && tweet.retweetCount > 0) stats.push(`${tweet.retweetCount} RT`);
    if (tweet.likeCount && tweet.likeCount > 0) stats.push(`${tweet.likeCount} likes`);
    if (tweet.replyCount && tweet.replyCount > 0) stats.push(`${tweet.replyCount} replies`);
    if (tweet.quoteCount && tweet.quoteCount > 0) stats.push(`${tweet.quoteCount} quotes`);

    if (stats.length > 0) {
      parts.push(`(${stats.join(", ")})`);
    }

    // Add timestamp
    if (tweet.createdAt) {
      const date = new Date(tweet.createdAt);
      parts.push(`posted ${date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
    }

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<XTweetDataTarget>): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      text: TextSanitizer.sanitize(entityWithoutInternalTimestamps.text, 1000),
      jsonData: TextSanitizer.sanitizeJsonData(entityWithoutInternalTimestamps.jsonData),
      // Include new fields for vector DB filtering and retrieval
      conversationId: entityWithoutInternalTimestamps.conversationId,
      inReplyToUserId: entityWithoutInternalTimestamps.inReplyToUserId,
      // Sanitize complex objects
      mediaAttachments: entityWithoutInternalTimestamps.mediaAttachments
        ? JSON.parse(TextSanitizer.sanitize(JSON.stringify(entityWithoutInternalTimestamps.mediaAttachments), 5000))
        : null,
      pollData: entityWithoutInternalTimestamps.pollData
        ? JSON.parse(TextSanitizer.sanitize(JSON.stringify(entityWithoutInternalTimestamps.pollData), 2000))
        : null,
      placeData: entityWithoutInternalTimestamps.placeData
        ? JSON.parse(TextSanitizer.sanitize(JSON.stringify(entityWithoutInternalTimestamps.placeData), 2000))
        : null,
    };

    return {
      __type: "x_tweet",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const xDescriptorsETL = {
  tweet: new ETLXTweetDescriptor(),
};
