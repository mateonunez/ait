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
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGoogleCalendarEventDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-calendar.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGoogleCalendarEventETL extends RetoveBaseETLAbstract<GoogleCalendarEventDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<GoogleCalendarEventDataTarget> =
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
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(googleCalendarEvents.updatedAt, cursor.timestamp),
            drizzleOrm.gt(googleCalendarEvents.id, cursor.id),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(googleCalendarEvents.updatedAt), drizzleOrm.asc(googleCalendarEvents.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return {
      table: googleCalendarEvents,
      updatedAtField: googleCalendarEvents.updatedAt,
      idField: googleCalendarEvents.id,
    };
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<GoogleCalendarEventDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(
    enriched: EnrichedEntity<GoogleCalendarEventDataTarget>,
  ): RetoveGoogleCalendarEventVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: GoogleCalendarEventDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
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
    return "google_calendar_event";
  }
}

export interface RetoveGoogleCalendarEventVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "google_calendar_event";
  } & Partial<GoogleCalendarEventDataTarget>;
}

export type RetoveGoogleCalendarVectorPoint = RetoveGoogleCalendarEventVectorPoint;
