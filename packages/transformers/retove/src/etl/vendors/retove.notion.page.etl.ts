import { type getPostgresClient, notionPages, type NotionPageDataTarget } from "@ait/postgres";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { qdrant } from "@ait/qdrant";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLNotionPageDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.notion.descriptor";
import { getCollectionNameByVendor } from "@ait/ai-sdk";

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

  protected async extract(limit: number): Promise<NotionPageDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(notionPages).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(page: NotionPageDataTarget): string {
    return this._descriptor.getEmbeddingText(page);
  }

  protected getPayload(page: NotionPageDataTarget): RetoveNotionPageVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(page);
  }

  protected override getIdBaseOffset(): number {
    return 7_000_000_000_000;
  }
}

export interface RetoveNotionPageVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "page";
  } & Partial<NotionPageDataTarget>;
}

export type RetoveNotionVectorPoint = RetoveNotionPageVectorPoint;
