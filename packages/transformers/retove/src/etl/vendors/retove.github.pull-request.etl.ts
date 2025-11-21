import {
  type getPostgresClient,
  githubPullRequests,
  type GitHubPullRequestDataTarget,
  drizzleOrm,
} from "@ait/postgres";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { qdrant } from "@ait/qdrant";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import { ETLGitHubPullRequestDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.descriptor";

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

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<GitHubPullRequestDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(githubPullRequests) as any;
      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(githubPullRequests.updatedAt, lastProcessedTimestamp));
      }
      return query.orderBy(drizzleOrm.asc(githubPullRequests.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(pullRequest: GitHubPullRequestDataTarget): string {
    return this._descriptor.getEmbeddingText(pullRequest);
  }

  protected getPayload(pullRequest: GitHubPullRequestDataTarget): RetoveGitHubPullRequestVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(pullRequest);
  }

  protected getIdBaseOffset(): number {
    return 5_100_000_000_000;
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const pullRequests = data as GitHubPullRequestDataTarget[];
    if (pullRequests.length === 0) return new Date();
    return pullRequests.reduce((max, pr) => {
      const prDate = pr.updatedAt ? new Date(pr.updatedAt) : new Date(0);
      return prDate > max ? prDate : max;
    }, new Date(0));
  }
}

export interface RetoveGitHubPullRequestVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "pull_request";
  } & Partial<GitHubPullRequestDataTarget>;
}
