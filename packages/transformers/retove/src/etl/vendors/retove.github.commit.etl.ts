import { type getPostgresClient, githubCommits, type GitHubCommitDataTarget, drizzleOrm } from "@ait/postgres";
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

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<GitHubCommitDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(githubCommits) as any;
      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(githubCommits.updatedAt, lastProcessedTimestamp));
      }
      return query.orderBy(drizzleOrm.asc(githubCommits.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(commit: GitHubCommitDataTarget): string {
    return this._descriptor.getEmbeddingText(commit);
  }

  protected getPayload(commit: GitHubCommitDataTarget): RetoveGitHubCommitVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(commit);
  }

  protected getIdBaseOffset(): number {
    return 5_200_000_000_000;
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const commits = data as GitHubCommitDataTarget[];
    if (commits.length === 0) return new Date();
    return commits.reduce((max, commit) => {
      const commitDate = commit.updatedAt ? new Date(commit.updatedAt) : new Date(0);
      return commitDate > max ? commitDate : max;
    }, new Date(0));
  }
}

export interface RetoveGitHubCommitVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "commit";
  } & Partial<GitHubCommitDataTarget>;
}
