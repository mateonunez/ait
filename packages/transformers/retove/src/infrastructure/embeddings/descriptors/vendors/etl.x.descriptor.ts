import type { XTweetDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";

export class ETLXTweetDescriptor implements IETLEmbeddingDescriptor<XTweetDataTarget> {
  public getEmbeddingText(tweet: XTweetDataTarget): string {
    const authorInfo = tweet.authorUsername ? ` (@${tweet.authorUsername})` : "";

    const sanitizedText = TextSanitizer.sanitize(tweet.text, 280);

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

    return `I tweeted${authorInfo}: ${sanitizedText}${engagement}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: XTweetDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      text: TextSanitizer.sanitize(entityWithoutInternalTimestamps.text, 1000),
      jsonData: TextSanitizer.sanitizeJsonData(entityWithoutInternalTimestamps.jsonData),
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
