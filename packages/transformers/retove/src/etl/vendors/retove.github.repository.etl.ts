import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type GitHubRepositoryDataTarget, drizzleOrm, type getPostgresClient, githubRepositories } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubRepositoryDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGitHubRepositoryETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<GitHubRepositoryDataTarget> =
    new ETLGitHubRepositoryDescriptor();

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
      { field_name: "metadata.fullName", field_schema: "keyword" as const },
      { field_name: "metadata.language", field_schema: "keyword" as const },
      { field_name: "metadata.pushedAt", field_schema: "datetime" as const },
      { field_name: "metadata.createdAt", field_schema: "datetime" as const },
      { field_name: "metadata.archived", field_schema: "bool" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "repository";
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GitHubRepositoryDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(githubRepositories) as any;

      if (cursor) {
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(githubRepositories.updatedAt, cursor.timestamp),
            drizzleOrm.gt(githubRepositories.id, cursor.id),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(githubRepositories.updatedAt), drizzleOrm.asc(githubRepositories.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return { table: githubRepositories, updatedAtField: githubRepositories.updatedAt, idField: githubRepositories.id };
  }

  protected getTextForEmbedding(repository: GitHubRepositoryDataTarget): string {
    return this._descriptor.getEmbeddingText(repository);
  }

  protected getPayload(repository: GitHubRepositoryDataTarget): RetoveGitHubRepositoryVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(repository);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const repo = item as GitHubRepositoryDataTarget;
    return {
      timestamp: repo.updatedAt ? new Date(repo.updatedAt) : new Date(0),
      id: repo.id,
    };
  }
}
export interface RetoveGitHubRepositoryVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "repository";
  } & Partial<GitHubRepositoryDataTarget>;
}
/**
 * Union type for GitHub vector points
 */

export type RetoveGitHubVectorPoint = RetoveGitHubRepositoryVectorPoint;
