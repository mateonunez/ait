import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type XTweetDataTarget, drizzleOrm, type getPostgresClient, xTweets } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLXTweetDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.x.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveXTweetETL extends RetoveBaseETLAbstract<XTweetDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<XTweetDataTarget> = new ETLXTweetDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("x"), retryOptions, embeddingsService);
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.createdAt", field_schema: "datetime" as const },
      { field_name: "metadata.authorId", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "x_tweet";
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<XTweetDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(xTweets) as any;

      if (cursor) {
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        query = query.where(
          drizzleOrm.and(drizzleOrm.gte(xTweets.updatedAt, cursor.timestamp), drizzleOrm.gt(xTweets.id, cursor.id)),
        );
      }

      return query.orderBy(drizzleOrm.asc(xTweets.updatedAt), drizzleOrm.asc(xTweets.id)).limit(limit).execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return { table: xTweets, updatedAtField: xTweets.updatedAt, idField: xTweets.id };
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<XTweetDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(enriched: EnrichedEntity<XTweetDataTarget>): RetoveXTweetVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: XTweetDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
    };
  }
}

export interface RetoveXTweetVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "x_tweet";
  } & Partial<XTweetDataTarget>;
}

export type RetoveXVectorPoint = RetoveXTweetVectorPoint;
