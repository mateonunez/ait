import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type NotionPageDataTarget, drizzleOrm, type getPostgresClient, notionPages } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLNotionPageDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.notion.descriptor";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";

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

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<NotionPageDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(notionPages) as any;

      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(notionPages.updatedAt, lastProcessedTimestamp));
      }

      return query.orderBy(drizzleOrm.asc(notionPages.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(page: NotionPageDataTarget): string {
    return this._descriptor.getEmbeddingText(page);
  }

  protected getPayload(page: NotionPageDataTarget): RetoveNotionPageVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(page);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const pages = data as NotionPageDataTarget[];
    if (pages.length === 0) return new Date();
    return pages.reduce((max, page) => {
      const pageDate = page.updatedAt ? new Date(page.updatedAt) : new Date(0);
      return pageDate > max ? pageDate : max;
    }, new Date(0));
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
