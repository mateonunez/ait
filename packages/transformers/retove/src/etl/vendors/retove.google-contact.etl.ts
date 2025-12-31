import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type GoogleContactDataTarget, drizzleOrm, type getPostgresClient, googleContacts } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGoogleContactDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-contact.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGoogleContactETL extends RetoveBaseETLAbstract<GoogleContactDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<GoogleContactDataTarget> = new ETLGoogleContactDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("google"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GoogleContactDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(googleContacts) as any;

      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(googleContacts.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(googleContacts.updatedAt, cursor.timestamp),
              drizzleOrm.gt(googleContacts.id, cursor.id),
            ),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(googleContacts.updatedAt), drizzleOrm.asc(googleContacts.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return {
      table: googleContacts,
      updatedAtField: googleContacts.updatedAt,
      idField: googleContacts.id,
    };
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<GoogleContactDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(enriched: EnrichedEntity<GoogleContactDataTarget>): RetoveGoogleContactVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: GoogleContactDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.email", field_schema: "keyword" as const },
      { field_name: "metadata.organization", field_schema: "keyword" as const },
      { field_name: "metadata.displayName", field_schema: "text" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "google_contact";
  }
}

export interface RetoveGoogleContactVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "google_contact";
  } & Partial<GoogleContactDataTarget>;
}
