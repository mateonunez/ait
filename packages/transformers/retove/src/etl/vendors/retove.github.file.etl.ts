import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import { type GitHubFileDataTarget, drizzleOrm, type getPostgresClient, githubRepositoryFiles } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubFileDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.file.descriptor";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";

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

  protected override _getEntityType(): string {
    return "repository_file";
  }

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<GitHubFileDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(githubRepositoryFiles) as any;

      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(githubRepositoryFiles.updatedAt, lastProcessedTimestamp));
      }

      return query.orderBy(drizzleOrm.asc(githubRepositoryFiles.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(file: GitHubFileDataTarget): string {
    return this._descriptor.getEmbeddingText(file);
  }

  protected getPayload(file: GitHubFileDataTarget): RetoveGitHubFileVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(file);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const files = data as GitHubFileDataTarget[];
    if (files.length === 0) {
      return new Date();
    }
    const latest = files.reduce((max, file) => {
      const fileDate = file.updatedAt ? new Date(file.updatedAt) : new Date(0);
      return fileDate > max ? fileDate : max;
    }, new Date(0));
    return latest;
  }
}

export interface RetoveGitHubFileVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "repository_file";
  } & Partial<GitHubFileDataTarget>;
}
