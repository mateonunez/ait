import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type GitHubIssueDataTarget, drizzleOrm, type getPostgresClient, githubIssues } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubIssueDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGitHubIssueETL extends RetoveBaseETLAbstract<GitHubIssueDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<GitHubIssueDataTarget> = new ETLGitHubIssueDescriptor();
  protected readonly _enableAIEnrichment = false;

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("github"), retryOptions, embeddingsService);
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.repositoryFullName", field_schema: "keyword" as const },
      { field_name: "metadata.state", field_schema: "keyword" as const },
      { field_name: "metadata.issueCreatedAt", field_schema: "datetime" as const },
      { field_name: "metadata.createdAt", field_schema: "datetime" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "github_issue";
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GitHubIssueDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(githubIssues) as any;
      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(githubIssues.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(githubIssues.updatedAt, cursor.timestamp),
              drizzleOrm.gt(githubIssues.id, cursor.id),
            ),
          ),
        );
      }
      return query
        .orderBy(drizzleOrm.asc(githubIssues.updatedAt), drizzleOrm.asc(githubIssues.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return { table: githubIssues, updatedAtField: githubIssues.updatedAt, idField: githubIssues.id };
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<GitHubIssueDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(enriched: EnrichedEntity<GitHubIssueDataTarget>): RetoveGitHubIssueVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const issue = item as GitHubIssueDataTarget;
    return {
      timestamp: issue.updatedAt ? new Date(issue.updatedAt) : new Date(0),
      id: issue.id,
    };
  }
}

export interface RetoveGitHubIssueVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "github_issue";
  } & Partial<GitHubIssueDataTarget>;
}
