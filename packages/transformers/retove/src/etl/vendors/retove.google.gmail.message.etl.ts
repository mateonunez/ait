import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import {
  type GoogleGmailMessageDataTarget,
  drizzleOrm,
  type getPostgresClient,
  googleGmailMessages,
} from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGmailMessageDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-gmail.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGoogleGmailMessageETL extends RetoveBaseETLAbstract<GoogleGmailMessageDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<GoogleGmailMessageDataTarget> =
    new ETLGmailMessageDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("google"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GoogleGmailMessageDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(googleGmailMessages) as any;

      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(googleGmailMessages.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(googleGmailMessages.updatedAt, cursor.timestamp),
              drizzleOrm.gt(googleGmailMessages.id, cursor.id),
            ),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(googleGmailMessages.updatedAt), drizzleOrm.asc(googleGmailMessages.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return {
      table: googleGmailMessages,
      updatedAtField: googleGmailMessages.updatedAt,
      idField: googleGmailMessages.id,
    };
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<GoogleGmailMessageDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(
    enriched: EnrichedEntity<GoogleGmailMessageDataTarget>,
  ): RetoveGoogleGmailMessageVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: GoogleGmailMessageDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.threadId", field_schema: "keyword" as const },
      { field_name: "metadata.labelIds", field_schema: "keyword" as const },
      { field_name: "metadata.from", field_schema: "keyword" as const },
      { field_name: "metadata.date", field_schema: "datetime" as const }, // internalDate mapped to date
    ];
  }

  protected override _getEntityType(): EntityType {
    return "gmail_message";
  }
}

export interface RetoveGoogleGmailMessageVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "gmail_message";
  } & Partial<GoogleGmailMessageDataTarget>;
}

export type RetoveGoogleGmailVectorPoint = RetoveGoogleGmailMessageVectorPoint;
