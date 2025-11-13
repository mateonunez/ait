import { type getPostgresClient, slackMessages, type SlackMessageDataTarget } from "@ait/postgres";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { qdrant } from "@ait/qdrant";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSlackMessageDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.slack.descriptor";
import { getCollectionNameByVendor } from "@ait/ai-sdk";

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

  protected async extract(limit: number): Promise<SlackMessageDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(slackMessages).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(message: SlackMessageDataTarget): string {
    return this._descriptor.getEmbeddingText(message);
  }

  protected getPayload(message: SlackMessageDataTarget): RetoveSlackMessageVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(message);
  }

  protected override getIdBaseOffset(): number {
    return 8_000_000_000_000;
  }
}

export interface RetoveSlackMessageVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "message";
  } & Partial<SlackMessageDataTarget>;
}

export type RetoveSlackVectorPoint = RetoveSlackMessageVectorPoint;
