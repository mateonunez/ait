import { type getPostgresClient, githubCommits, type GitHubCommitDataTarget } from "@ait/postgres";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { qdrant } from "@ait/qdrant";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubCommitDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.descriptor";
import { getCollectionNameByVendor } from "@ait/ai-sdk";

export class RetoveGitHubCommitETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<GitHubCommitDataTarget> = new ETLGitHubCommitDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("github"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number): Promise<GitHubCommitDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(githubCommits).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(commit: GitHubCommitDataTarget): string {
    return this._descriptor.getEmbeddingText(commit);
  }

  protected getPayload(commit: GitHubCommitDataTarget): RetoveGitHubCommitVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(commit);
  }

  protected override getIdBaseOffset(): number {
    return 5_200_000_000_000;
  }
}

export interface RetoveGitHubCommitVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "commit";
  } & Partial<GitHubCommitDataTarget>;
}
