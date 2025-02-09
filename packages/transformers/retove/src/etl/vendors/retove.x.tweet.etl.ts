import { ETLXTweetDescriptor } from "@/infrastructure/embeddings/descriptors/vendors/etl.x.descriptor";
import { type BaseVectorPoint, RetoveBaseETLAbstract, type RetryOptions } from "../retove.base-etl.abstract";
import { xTweets, type getPostgresClient, type XTweetDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "@/infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import type { qdrant } from "@ait/qdrant";
import type { IEmbeddingsService } from "@ait/langchain";

const defaultCollectionName = "x_tweets_collection";

export class RetoveXTweetETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<XTweetDataTarget> = new ETLXTweetDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, defaultCollectionName, retryOptions, embeddingsService);
  }

  protected async extract(limit: number): Promise<XTweetDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(xTweets).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(tweet: XTweetDataTarget): string {
    return this._descriptor.getEmbeddingText(tweet);
  }

  protected getPayload(tweet: XTweetDataTarget): RetoveXTweetVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(tweet);
  }
}

export interface RetoveXTweetVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "tweet";
  } & Partial<XTweetDataTarget>;
}

export type RetoveXVectorPoint = RetoveXTweetVectorPoint;
