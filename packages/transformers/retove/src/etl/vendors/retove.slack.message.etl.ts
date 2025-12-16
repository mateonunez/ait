import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type SlackMessageDataTarget, drizzleOrm, type getPostgresClient, slackMessages } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSlackMessageDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.slack.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveSlackMessageETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SlackMessageDataTarget> = new ETLSlackMessageDescriptor();

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
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(slackMessages.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(slackMessages.updatedAt, cursor.timestamp),
              drizzleOrm.gt(slackMessages.id, cursor.id),
            ),
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

  protected getTextForEmbedding(message: SlackMessageDataTarget): string {
    return this._descriptor.getEmbeddingText(message);
  }

  protected getPayload(message: SlackMessageDataTarget): RetoveSlackMessageVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(message);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const message = item as SlackMessageDataTarget;
    return {
      timestamp: message.updatedAt ? new Date(message.updatedAt) : new Date(0),
      id: message.id,
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
    return "message";
  }
}

export interface RetoveSlackMessageVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "message";
  } & Partial<SlackMessageDataTarget>;
}

export type RetoveSlackVectorPoint = RetoveSlackMessageVectorPoint;
