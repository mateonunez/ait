import { type IEmbeddingsService, getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import {
  type GoogleSubscriptionDataTarget,
  drizzleOrm,
  type getPostgresClient,
  googleSubscriptions,
} from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGoogleYouTubeSubscriptionDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-youtube.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGoogleYouTubeSubscriptionETL extends RetoveBaseETLAbstract<GoogleSubscriptionDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<GoogleSubscriptionDataTarget> =
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
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(googleSubscriptions.updatedAt, cursor.timestamp),
            drizzleOrm.gt(googleSubscriptions.id, cursor.id),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(googleSubscriptions.updatedAt), drizzleOrm.asc(googleSubscriptions.id))
        .limit(limit)
        .execute();
    });
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<GoogleSubscriptionDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(
    enriched: EnrichedEntity<GoogleSubscriptionDataTarget>,
  ): RetoveGoogleYouTubeSubscriptionVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: GoogleSubscriptionDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
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
    return "google_youtube_subscription";
  }
}

export interface RetoveGoogleYouTubeSubscriptionVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "google_youtube_subscription";
  } & Partial<GoogleSubscriptionDataTarget>;
}

export type RetoveGoogleYouTubeVectorPoint = RetoveGoogleYouTubeSubscriptionVectorPoint;
