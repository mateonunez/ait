import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type LinearIssueDataTarget, drizzleOrm, type getPostgresClient, linearIssues } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLLinearIssueDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.linear.descriptor";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";

export class RetoveLinearIssueETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<LinearIssueDataTarget> = new ETLLinearIssueDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("linear"), retryOptions, embeddingsService);
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.state", field_schema: "keyword" as const },
      { field_name: "metadata.priority", field_schema: "integer" as const },
      { field_name: "metadata.createdAt", field_schema: "datetime" as const },
      { field_name: "metadata.teamId", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "issue";
  }

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<LinearIssueDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(linearIssues) as any;

      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(linearIssues.updatedAt, lastProcessedTimestamp));
      }

      return query.orderBy(drizzleOrm.asc(linearIssues.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(issue: LinearIssueDataTarget): string {
    return this._descriptor.getEmbeddingText(issue);
  }

  protected getPayload(issue: LinearIssueDataTarget): RetoveLinearIssueVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(issue);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const issues = data as LinearIssueDataTarget[];
    if (issues.length === 0) return new Date();
    return issues.reduce((max, issue) => {
      const issueDate = issue.updatedAt ? new Date(issue.updatedAt) : new Date(0);
      return issueDate > max ? issueDate : max;
    }, new Date(0));
  }
}

export interface RetoveLinearIssueVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "issue";
  } & Partial<LinearIssueDataTarget>;
}

export type RetoveLinearVectorPoint = RetoveLinearIssueVectorPoint;
