import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type GitHubCommitDataTarget, drizzleOrm, type getPostgresClient, githubCommits } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubCommitDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.descriptor";
import { RetoveBaseETLAbstract } from "../retove.base-etl.abstract";
import type { BaseVectorPoint, RetryOptions } from "../retove.base-etl.abstract";

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

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.repositoryFullName", field_schema: "keyword" as const },
      { field_name: "metadata.authorDate", field_schema: "datetime" as const },
      { field_name: "metadata.authorName", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "commit";
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
