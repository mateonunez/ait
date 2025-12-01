import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import {
  type GoogleSubscriptionDataTarget,
  drizzleOrm,
  type getPostgresClient,
  googleSubscriptions,
} from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGoogleYouTubeSubscriptionDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-youtube.descriptor";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";

export class RetoveGoogleYouTubeSubscriptionETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<GoogleSubscriptionDataTarget> =
    new ETLGoogleYouTubeSubscriptionDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("google"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<GoogleSubscriptionDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(googleSubscriptions) as any;

      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(googleSubscriptions.updatedAt, lastProcessedTimestamp));
      }

      return query.orderBy(drizzleOrm.asc(googleSubscriptions.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(subscription: GoogleSubscriptionDataTarget): string {
    return this._descriptor.getEmbeddingText(subscription);
  }

  protected getPayload(
    subscription: GoogleSubscriptionDataTarget,
  ): RetoveGoogleYouTubeSubscriptionVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(subscription);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const subscriptions = data as GoogleSubscriptionDataTarget[];
    if (subscriptions.length === 0) return new Date();
    return subscriptions.reduce((max, sub) => {
      const subDate = sub.updatedAt ? new Date(sub.updatedAt) : new Date(0);
      return subDate > max ? subDate : max;
    }, new Date(0));
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.channelId", field_schema: "keyword" as const },
      { field_name: "metadata.resourceChannelId", field_schema: "keyword" as const },
      { field_name: "metadata.publishedAt", field_schema: "datetime" as const },
      { field_name: "metadata.totalItemCount", field_schema: "integer" as const },
    ];
  }

  protected override _getEntityType(): string {
    return "subscription";
  }
}

export interface RetoveGoogleYouTubeSubscriptionVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "subscription";
  } & Partial<GoogleSubscriptionDataTarget>;
}

export type RetoveGoogleYouTubeVectorPoint = RetoveGoogleYouTubeSubscriptionVectorPoint;
