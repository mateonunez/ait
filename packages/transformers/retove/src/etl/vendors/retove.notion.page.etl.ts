import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type NotionPageDataTarget, drizzleOrm, type getPostgresClient, notionPages } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLNotionPageDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.notion.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveNotionPageETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<NotionPageDataTarget> = new ETLNotionPageDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("notion"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<NotionPageDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(notionPages) as any;

      if (cursor) {
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(notionPages.updatedAt, cursor.timestamp),
            drizzleOrm.gt(notionPages.id, cursor.id),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(notionPages.updatedAt), drizzleOrm.asc(notionPages.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return { table: notionPages, updatedAtField: notionPages.updatedAt, idField: notionPages.id };
  }

  protected getTextForEmbedding(page: NotionPageDataTarget): string {
    return this._descriptor.getEmbeddingText(page);
  }

  protected getPayload(page: NotionPageDataTarget): RetoveNotionPageVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(page);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const page = item as NotionPageDataTarget;
    return {
      timestamp: page.updatedAt ? new Date(page.updatedAt) : new Date(0),
      id: page.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.title", field_schema: "keyword" as const },
      { field_name: "metadata.createdAt", field_schema: "datetime" as const },
      { field_name: "metadata.lastEditedAt", field_schema: "datetime" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "page";
  }
}

export interface RetoveNotionPageVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "page";
  } & Partial<NotionPageDataTarget>;
}

export type RetoveNotionVectorPoint = RetoveNotionPageVectorPoint;
