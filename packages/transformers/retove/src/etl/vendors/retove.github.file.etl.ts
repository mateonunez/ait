import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type GitHubFileDataTarget, drizzleOrm, type getPostgresClient, githubRepositoryFiles } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubFileDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.file.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

/**
 * ETL job for GitHub repository files.
 * Extracts files from the database, generates embeddings, and loads them into Qdrant.
 */
export class RetoveGitHubFileETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<GitHubFileDataTarget> = new ETLGitHubFileDescriptor();

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
      { field_name: "metadata.path", field_schema: "keyword" as const },
      { field_name: "metadata.repositoryFullName", field_schema: "keyword" as const },
      { field_name: "metadata.language", field_schema: "keyword" as const },
      { field_name: "metadata.branch", field_schema: "keyword" as const },
      { field_name: "metadata.extension", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "repository_file";
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GitHubFileDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(githubRepositoryFiles) as any;

      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(githubRepositoryFiles.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(githubRepositoryFiles.updatedAt, cursor.timestamp),
              drizzleOrm.gt(githubRepositoryFiles.id, cursor.id),
            ),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(githubRepositoryFiles.updatedAt), drizzleOrm.asc(githubRepositoryFiles.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return {
      table: githubRepositoryFiles,
      updatedAtField: githubRepositoryFiles.updatedAt,
      idField: githubRepositoryFiles.id,
    };
  }

  protected getTextForEmbedding(file: GitHubFileDataTarget): string {
    return this._descriptor.getEmbeddingText(file);
  }

  protected getPayload(file: GitHubFileDataTarget): RetoveGitHubFileVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(file);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const file = item as GitHubFileDataTarget;
    return {
      timestamp: file.updatedAt ? new Date(file.updatedAt) : new Date(0),
      id: file.id,
    };
  }
}

export interface RetoveGitHubFileVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "repository_file";
  } & Partial<GitHubFileDataTarget>;
}
