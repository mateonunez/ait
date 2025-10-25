import { type getPostgresClient, linearIssues, type LinearIssueDataTarget } from "@ait/postgres";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { qdrant } from "@ait/qdrant";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLLinearIssueDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.linear.descriptor";
import { RETOVE_COLLECTION_NAME } from "../../config/retove.config";

export class RetoveLinearIssueETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<LinearIssueDataTarget> = new ETLLinearIssueDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, RETOVE_COLLECTION_NAME, retryOptions, embeddingsService);
  }

  protected async extract(limit: number): Promise<LinearIssueDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(linearIssues).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(issue: LinearIssueDataTarget): string {
    return this._descriptor.getEmbeddingText(issue);
  }

  protected getPayload(issue: LinearIssueDataTarget): RetoveLinearIssueVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(issue);
  }

  protected override getIdBaseOffset(): number {
    return 6_000_000_000_000;
  }
}

export interface RetoveLinearIssueVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "issue";
  } & Partial<LinearIssueDataTarget>;
}

export type RetoveLinearVectorPoint = RetoveLinearIssueVectorPoint;
