import { type getPostgresClient, githubRepositories, type GitHubRepositoryDataTarget } from "@ait/postgres";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { qdrant } from "@ait/qdrant";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";
import type { IEmbeddingsService } from "@ait/langchain";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubRepositoryDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.descriptor";

const defaultCollectionName = "github_repositories_collection";

export class RetoveGitHubRepositoryETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<GitHubRepositoryDataTarget> =
    new ETLGitHubRepositoryDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, defaultCollectionName, retryOptions, embeddingsService);
  }

  protected async extract(limit: number): Promise<GitHubRepositoryDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(githubRepositories).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(repository: GitHubRepositoryDataTarget): string {
    return this._descriptor.getEmbeddingText(repository);
  }

  protected getPayload(repository: GitHubRepositoryDataTarget): RetoveGitHubRepositoryVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(repository);
  }
}
export interface RetoveGitHubRepositoryVectorPoint extends BaseVectorPoint {
  payload: {
    type: "repository";
  } & Partial<GitHubRepositoryDataTarget>;
}
/**
 * Union type for GitHub vector points
 */

export type RetoveGitHubVectorPoint = RetoveGitHubRepositoryVectorPoint;
