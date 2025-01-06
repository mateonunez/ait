import {
  type getPostgresClient,
  githubRepositories,
  type GitHubRepositoryDataTarget,
} from "@ait/postgres";
import { ETLBase } from "../etl.base";
import type { qdrant } from "@ait/qdrant";
import type { RetryOptions } from "../etl.abstract";
import type { IEmbeddingsService } from "../../infrastructure/embeddings/etl.embeddings.service";
import type { GitHubRepositoryVectorPoint } from "./github.etl.interface";

const defaultCollectionName = "github_repositories_collection";

export class GitHubRepositoryETL extends ETLBase {
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
    return `${repository.name} ${repository.description} ${repository.language}`;
  }

  protected getPayload(repository: GitHubRepositoryDataTarget): GitHubRepositoryVectorPoint["payload"] {
    return {
      type: "repository",
      ...repository,
    };
  }
}
