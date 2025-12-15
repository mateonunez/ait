import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import {
  type GoogleCalendarEventDataTarget,
  drizzleOrm,
  type getPostgresClient,
  googleCalendarEvents,
} from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGoogleCalendarEventDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-calendar.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGoogleCalendarEventETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<GoogleCalendarEventDataTarget> =
    new ETLGoogleCalendarEventDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("google"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GoogleCalendarEventDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(googleCalendarEvents) as any;

      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(googleCalendarEvents.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(googleCalendarEvents.updatedAt, cursor.timestamp),
              drizzleOrm.gt(googleCalendarEvents.id, cursor.id),
            ),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(googleCalendarEvents.updatedAt), drizzleOrm.asc(googleCalendarEvents.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig() {
    return {
      table: googleCalendarEvents,
      updatedAtField: googleCalendarEvents.updatedAt,
      idField: googleCalendarEvents.id,
    };
  }

  protected getTextForEmbedding(event: GoogleCalendarEventDataTarget): string {
    return this._descriptor.getEmbeddingText(event);
  }

  protected getPayload(event: GoogleCalendarEventDataTarget): RetoveGoogleCalendarEventVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(event);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const event = item as GoogleCalendarEventDataTarget;
    return {
      timestamp: event.updatedAt ? new Date(event.updatedAt) : new Date(0),
      id: event.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.calendarId", field_schema: "keyword" as const },
      { field_name: "metadata.status", field_schema: "keyword" as const },
      { field_name: "metadata.startTime", field_schema: "datetime" as const },
      { field_name: "metadata.endTime", field_schema: "datetime" as const },
      { field_name: "metadata.isAllDay", field_schema: "bool" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "event";
  }
}

export interface RetoveGoogleCalendarEventVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "event";
  } & Partial<GoogleCalendarEventDataTarget>;
}

export type RetoveGoogleCalendarVectorPoint = RetoveGoogleCalendarEventVectorPoint;
