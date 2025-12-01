import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import { type GitHubRepositoryDataTarget, drizzleOrm, type getPostgresClient, githubRepositories } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubRepositoryDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.descriptor";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";

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

  protected override _getEntityType(): string {
    return "repository";
  }

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<GitHubRepositoryDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(githubRepositories) as any;

      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(githubRepositories.updatedAt, lastProcessedTimestamp));
      }

      return query.orderBy(drizzleOrm.asc(githubRepositories.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(repository: GitHubRepositoryDataTarget): string {
    return this._descriptor.getEmbeddingText(repository);
  }

  protected getPayload(repository: GitHubRepositoryDataTarget): RetoveGitHubRepositoryVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(repository);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const repositories = data as GitHubRepositoryDataTarget[];
    if (repositories.length === 0) {
      return new Date();
    }
    const latest = repositories.reduce((max, repo) => {
      const repoDate = repo.updatedAt ? new Date(repo.updatedAt) : new Date(0);
      return repoDate > max ? repoDate : max;
    }, new Date(0));
    return latest;
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
