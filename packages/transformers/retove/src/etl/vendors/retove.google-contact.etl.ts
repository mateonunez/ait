import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type GoogleContactDataTarget, drizzleOrm, type getPostgresClient, googleContacts } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGoogleContactDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-contact.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGoogleContactETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<GoogleContactDataTarget> = new ETLGoogleContactDescriptor();

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
          drizzleOrm.and(
            drizzleOrm.gte(googleContacts.updatedAt, cursor.timestamp),
            drizzleOrm.gt(googleContacts.id, cursor.id),
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

  protected getTextForEmbedding(contact: GoogleContactDataTarget): string {
    return this._descriptor.getEmbeddingText(contact);
  }

  protected getPayload(contact: GoogleContactDataTarget): RetoveGoogleContactVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(contact);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const contact = item as GoogleContactDataTarget;
    return {
      timestamp: contact.updatedAt ? new Date(contact.updatedAt) : new Date(0),
      id: contact.id,
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
