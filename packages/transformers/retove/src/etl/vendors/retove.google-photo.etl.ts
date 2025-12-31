import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type GooglePhotoDataTarget, drizzleOrm, type getPostgresClient, googlePhotos } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGooglePhotoDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-photo.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGooglePhotoETL extends RetoveBaseETLAbstract<GooglePhotoDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<GooglePhotoDataTarget> = new ETLGooglePhotoDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("google"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GooglePhotoDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(googlePhotos) as any;

      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(googlePhotos.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(googlePhotos.updatedAt, cursor.timestamp),
              drizzleOrm.gt(googlePhotos.id, cursor.id),
            ),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(googlePhotos.updatedAt), drizzleOrm.asc(googlePhotos.id))
        .limit(limit)
        .execute();
    });
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<GooglePhotoDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(enriched: EnrichedEntity<GooglePhotoDataTarget>): RetoveGooglePhotoVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: GooglePhotoDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.filename", field_schema: "text" as const },
      { field_name: "metadata.description", field_schema: "text" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "google_photo";
  }
}

export interface RetoveGooglePhotoVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "google_photo";
  } & Partial<GooglePhotoDataTarget>;
}
