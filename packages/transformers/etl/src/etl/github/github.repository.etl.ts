import { type getPostgresClient, githubRepositories, type GitHubRepositoryDataTarget } from "@ait/postgres";
import { BaseETLAbstract } from "../etl.base.abstract";
import type { qdrant } from "@ait/qdrant";
import type { RetryOptions } from "../etl.base.abstract";
import type { IEmbeddingsService } from "@ait/langchain";
import type { GitHubRepositoryVectorPoint } from "./github.etl.interface";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubRepositoryDescriptor } from "../../infrastructure/embeddings/descriptors/github/etl.github.descriptor";

const defaultCollectionName = "github_repositories_collection";

export class GitHubRepositoryETL extends BaseETLAbstract {
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

  protected getPayload(repository: GitHubRepositoryDataTarget): GitHubRepositoryVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(repository);
  }
}
