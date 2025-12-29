import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type GitHubCommitDataTarget, drizzleOrm, type getPostgresClient, githubCommits } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGitHubCommitDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.github.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGitHubCommitETL extends RetoveBaseETLAbstract<GitHubCommitDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<GitHubCommitDataTarget> = new ETLGitHubCommitDescriptor();

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
      { field_name: "metadata.authorName", field_schema: "keyword" as const },
      { field_name: "metadata.message", field_schema: "keyword" as const },
    ];
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return { table: githubCommits, updatedAtField: githubCommits.updatedAt, idField: githubCommits.sha };
  }

  protected override _getEntityType(): EntityType {
    return "github_commit";
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GitHubCommitDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(githubCommits) as any;
      if (cursor) {
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(githubCommits.updatedAt, cursor.timestamp),
            drizzleOrm.gt(githubCommits.sha, cursor.id),
          ),
        );
      }
      return query
        .orderBy(drizzleOrm.asc(githubCommits.updatedAt), drizzleOrm.asc(githubCommits.sha))
        .limit(limit)
        .execute();
    });
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<GitHubCommitDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(enriched: EnrichedEntity<GitHubCommitDataTarget>): RetoveGitHubCommitVectorPoint["payload"] {
    const payload = this._descriptor.getEmbeddingPayload(enriched);
    // Ensure we have an 'id' for the base ETL to use (polyfill sha as id if missing)
    if (!("id" in enriched.target)) {
      payload.id = (enriched.target as any).sha;
    }
    return { ...payload, __type: "github_commit" } as RetoveGitHubCommitVectorPoint["payload"];
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const commit = item as GitHubCommitDataTarget;
    return {
      timestamp: commit.updatedAt ? new Date(commit.updatedAt) : new Date(0),
      id: commit.sha,
    };
  }
}

export interface RetoveGitHubCommitVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "github_commit";
  } & Partial<GitHubCommitDataTarget>;
}
