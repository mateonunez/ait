import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import {
  type GitHubPullRequestDataTarget,
  drizzleOrm,
  type getPostgresClient,
  githubPullRequests,
} from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubPullRequestDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGitHubPullRequestETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<GitHubPullRequestDataTarget> =
    new ETLGitHubPullRequestDescriptor();

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
      { field_name: "metadata.merged", field_schema: "bool" as const },
      { field_name: "metadata.mergedAt", field_schema: "datetime" as const },
      { field_name: "metadata.createdAt", field_schema: "datetime" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "pull_request";
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GitHubPullRequestDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(githubPullRequests) as any;
      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(githubPullRequests.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(githubPullRequests.updatedAt, cursor.timestamp),
              drizzleOrm.gt(githubPullRequests.id, cursor.id),
            ),
          ),
        );
      }
      return query
        .orderBy(drizzleOrm.asc(githubPullRequests.updatedAt), drizzleOrm.asc(githubPullRequests.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig() {
    return { table: githubPullRequests, updatedAtField: githubPullRequests.updatedAt, idField: githubPullRequests.id };
  }

  protected getTextForEmbedding(pullRequest: GitHubPullRequestDataTarget): string {
    return this._descriptor.getEmbeddingText(pullRequest);
  }

  protected getPayload(pullRequest: GitHubPullRequestDataTarget): RetoveGitHubPullRequestVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(pullRequest);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const pr = item as GitHubPullRequestDataTarget;
    return {
      timestamp: pr.updatedAt ? new Date(pr.updatedAt) : new Date(0),
      id: pr.id,
    };
  }
}

export interface RetoveGitHubPullRequestVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "pull_request";
  } & Partial<GitHubPullRequestDataTarget>;
}
