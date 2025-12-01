import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import { type SlackMessageDataTarget, drizzleOrm, type getPostgresClient, slackMessages } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSlackMessageDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.slack.descriptor";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";

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

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<SlackMessageDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(slackMessages) as any;

      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(slackMessages.updatedAt, lastProcessedTimestamp));
      }

      return query.orderBy(drizzleOrm.asc(slackMessages.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(message: SlackMessageDataTarget): string {
    return this._descriptor.getEmbeddingText(message);
  }

  protected getPayload(message: SlackMessageDataTarget): RetoveSlackMessageVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(message);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const messages = data as SlackMessageDataTarget[];
    if (messages.length === 0) return new Date();
    return messages.reduce((max, message) => {
      const messageDate = message.updatedAt ? new Date(message.updatedAt) : new Date(0);
      return messageDate > max ? messageDate : max;
    }, new Date(0));
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.channelId", field_schema: "keyword" as const },
      { field_name: "metadata.userId", field_schema: "keyword" as const },
      { field_name: "metadata.timestamp", field_schema: "datetime" as const },
    ];
  }

  protected override _getEntityType(): string {
    return "message";
  }
}

export interface RetoveSlackMessageVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "message";
  } & Partial<SlackMessageDataTarget>;
}

export type RetoveSlackVectorPoint = RetoveSlackMessageVectorPoint;
