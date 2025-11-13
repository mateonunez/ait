import type { XTweetDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";

export class ETLXTweetDescriptor implements IETLEmbeddingDescriptor<XTweetDataTarget> {
  public getEmbeddingText(tweet: XTweetDataTarget): string {
    const authorInfo = tweet.authorUsername ? ` (@${tweet.authorUsername})` : "";

    const sanitizedText = TextSanitizer.sanitize(tweet.text, 280);

    // Build context parts for media, poll, and location
    const contextParts: string[] = [];

    // Add media context
    if (tweet.mediaAttachments && Array.isArray(tweet.mediaAttachments) && tweet.mediaAttachments.length > 0) {
      const mediaTypes = tweet.mediaAttachments.map((m: any) => m.type);
      const photoCount = mediaTypes.filter((t) => t === "photo").length;
      const videoCount = mediaTypes.filter((t) => t === "video").length;
      const gifCount = mediaTypes.filter((t) => t === "animated_gif").length;

      const mediaParts: string[] = [];
      if (photoCount > 0) mediaParts.push(photoCount === 1 ? "1 photo" : `${photoCount} photos`);
      if (videoCount > 0) mediaParts.push(videoCount === 1 ? "1 video" : `${videoCount} videos`);
      if (gifCount > 0) mediaParts.push("GIF");

      if (mediaParts.length > 0) {
        contextParts.push(`with ${mediaParts.join(", ")}`);
      }
    }

    // Add poll context
    if (tweet.pollData) {
      const poll = tweet.pollData as any;
      if (poll.options && Array.isArray(poll.options)) {
        const optionCount = poll.options.length;
        const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + (opt.votes || 0), 0);
        contextParts.push(`poll with ${optionCount} options${totalVotes > 0 ? ` (${totalVotes} votes)` : ""}`);
      }
    }

    // Add location context
    if (tweet.placeData) {
      const place = tweet.placeData as any;
      if (place.full_name) {
        contextParts.push(`from ${place.full_name}`);
      } else if (place.name) {
        contextParts.push(`from ${place.name}`);
      }
    }

    const context = contextParts.length > 0 ? ` ${contextParts.join(", ")}` : "";

    // Build engagement parts
    const engagementParts: string[] = [];
    if (tweet.retweetCount && tweet.retweetCount > 0) {
      engagementParts.push(`${tweet.retweetCount} retweets`);
    }
    if (tweet.likeCount && tweet.likeCount > 0) {
      engagementParts.push(`${tweet.likeCount} likes`);
    }
    if (tweet.replyCount && tweet.replyCount > 0) {
      engagementParts.push(`${tweet.replyCount} replies`);
    }
    if (tweet.quoteCount && tweet.quoteCount > 0) {
      engagementParts.push(`${tweet.quoteCount} quotes`);
    }

    const engagement = engagementParts.length > 0 ? `, ${engagementParts.join(", ")}` : "";

    return `I tweeted${authorInfo}: ${sanitizedText}${context}${engagement}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: XTweetDataTarget): U {
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
      __type: "tweet",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const xDescriptorsETL = {
  tweet: new ETLXTweetDescriptor(),
};
