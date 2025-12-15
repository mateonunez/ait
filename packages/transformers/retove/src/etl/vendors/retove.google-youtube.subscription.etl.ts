import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import {
  type GoogleSubscriptionDataTarget,
  drizzleOrm,
  type getPostgresClient,
  googleSubscriptions,
} from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGoogleYouTubeSubscriptionDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-youtube.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

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

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GoogleSubscriptionDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(googleSubscriptions) as any;

      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(googleSubscriptions.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(googleSubscriptions.updatedAt, cursor.timestamp),
              drizzleOrm.gt(googleSubscriptions.id, cursor.id),
            ),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(googleSubscriptions.updatedAt), drizzleOrm.asc(googleSubscriptions.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig() {
    return {
      table: googleSubscriptions,
      updatedAtField: googleSubscriptions.updatedAt,
      idField: googleSubscriptions.id,
    };
  }

  protected getTextForEmbedding(subscription: GoogleSubscriptionDataTarget): string {
    return this._descriptor.getEmbeddingText(subscription);
  }

  protected getPayload(
    subscription: GoogleSubscriptionDataTarget,
  ): RetoveGoogleYouTubeSubscriptionVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(subscription);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const sub = item as GoogleSubscriptionDataTarget;
    return {
      timestamp: sub.updatedAt ? new Date(sub.updatedAt) : new Date(0),
      id: sub.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.channelId", field_schema: "keyword" as const },
      { field_name: "metadata.resourceChannelId", field_schema: "keyword" as const },
      { field_name: "metadata.publishedAt", field_schema: "datetime" as const },
      { field_name: "metadata.totalItemCount", field_schema: "integer" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "subscription";
  }
}

export interface RetoveGoogleYouTubeSubscriptionVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "subscription";
  } & Partial<GoogleSubscriptionDataTarget>;
}

export type RetoveGoogleYouTubeVectorPoint = RetoveGoogleYouTubeSubscriptionVectorPoint;
