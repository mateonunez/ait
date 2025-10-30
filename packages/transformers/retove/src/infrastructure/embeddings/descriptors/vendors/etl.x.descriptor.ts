import type { XTweetDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLXTweetDescriptor implements IETLEmbeddingDescriptor<XTweetDataTarget> {
  public getEmbeddingText(tweet: XTweetDataTarget): string {
    const parts = [
      `I tweeted: ${tweet.text}`,
      tweet.retweetCount && tweet.retweetCount > 0 ? `${tweet.retweetCount} retweets` : null,
      tweet.likeCount && tweet.likeCount > 0 ? `${tweet.likeCount} likes` : null,
    ].filter(Boolean);

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: XTweetDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;
    return {
      __type: "tweet",
      ...entityWithoutInternalTimestamps,
    } as unknown as U;
  }
}

export const xDescriptorsETL = {
  tweet: new ETLXTweetDescriptor(),
};
