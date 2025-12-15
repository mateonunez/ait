import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type XTweetDataTarget, drizzleOrm, type getPostgresClient, xTweets } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLXTweetDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.x.descriptor";
import { type BaseVectorPoint, RetoveBaseETLAbstract, type RetryOptions } from "../retove.base-etl.abstract";

export class RetoveXTweetETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<XTweetDataTarget> = new ETLXTweetDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("x"), retryOptions, embeddingsService);
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.createdAt", field_schema: "datetime" as const },
      { field_name: "metadata.authorId", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "tweet";
  }

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<XTweetDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(xTweets) as any;

      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(xTweets.updatedAt, lastProcessedTimestamp));
      }

      return query.orderBy(drizzleOrm.asc(xTweets.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(tweet: XTweetDataTarget): string {
    return this._descriptor.getEmbeddingText(tweet);
  }

  protected getPayload(tweet: XTweetDataTarget): RetoveXTweetVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(tweet);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const tweets = data as XTweetDataTarget[];
    if (tweets.length === 0) return new Date();
    return tweets.reduce((max, tweet) => {
      const tweetDate = tweet.updatedAt ? new Date(tweet.updatedAt) : new Date(0);
      return tweetDate > max ? tweetDate : max;
    }, new Date(0));
  }
}

export interface RetoveXTweetVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "tweet";
  } & Partial<XTweetDataTarget>;
}

export type RetoveXVectorPoint = RetoveXTweetVectorPoint;
