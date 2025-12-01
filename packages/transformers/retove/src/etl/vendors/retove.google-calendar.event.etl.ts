import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import {
  type GoogleCalendarEventDataTarget,
  drizzleOrm,
  type getPostgresClient,
  googleCalendarEvents,
} from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGoogleCalendarEventDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-calendar.descriptor";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";

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

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<GoogleCalendarEventDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(googleCalendarEvents) as any;

      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(googleCalendarEvents.updatedAt, lastProcessedTimestamp));
      }

      return query.orderBy(drizzleOrm.asc(googleCalendarEvents.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(event: GoogleCalendarEventDataTarget): string {
    return this._descriptor.getEmbeddingText(event);
  }

  protected getPayload(event: GoogleCalendarEventDataTarget): RetoveGoogleCalendarEventVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(event);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const events = data as GoogleCalendarEventDataTarget[];
    if (events.length === 0) return new Date();
    return events.reduce((max, event) => {
      const eventDate = event.updatedAt ? new Date(event.updatedAt) : new Date(0);
      return eventDate > max ? eventDate : max;
    }, new Date(0));
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

  protected override _getEntityType(): string {
    return "event";
  }
}

export interface RetoveGoogleCalendarEventVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "event";
  } & Partial<GoogleCalendarEventDataTarget>;
}

export type RetoveGoogleCalendarVectorPoint = RetoveGoogleCalendarEventVectorPoint;
