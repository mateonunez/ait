import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type SlackMessageDataTarget, drizzleOrm, type getPostgresClient, slackMessages } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSlackMessageDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.slack.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveSlackMessageETL extends RetoveBaseETLAbstract<SlackMessageDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<SlackMessageDataTarget> = new ETLSlackMessageDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("slack"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<SlackMessageDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(slackMessages) as any;

      if (cursor) {
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        // When JS Date truncates microseconds, we might see the same timestamp again
        // The ID comparison ensures we skip all records up to and including the cursor ID
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(slackMessages.updatedAt, cursor.timestamp),
            drizzleOrm.gt(slackMessages.id, cursor.id),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(slackMessages.updatedAt), drizzleOrm.asc(slackMessages.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return { table: slackMessages, updatedAtField: slackMessages.updatedAt, idField: slackMessages.id };
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<SlackMessageDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(enriched: EnrichedEntity<SlackMessageDataTarget>): RetoveSlackMessageVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: SlackMessageDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.channelId", field_schema: "keyword" as const },
      { field_name: "metadata.userId", field_schema: "keyword" as const },
      { field_name: "metadata.timestamp", field_schema: "datetime" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "slack_message";
  }
}

export interface RetoveSlackMessageVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "slack_message";
  } & Partial<SlackMessageDataTarget>;
}

export type RetoveSlackVectorPoint = RetoveSlackMessageVectorPoint;
