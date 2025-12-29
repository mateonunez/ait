import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { type LinearIssueDataTarget, drizzleOrm, type getPostgresClient, linearIssues } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLLinearIssueDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.linear.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveLinearIssueETL extends RetoveBaseETLAbstract<LinearIssueDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<LinearIssueDataTarget> = new ETLLinearIssueDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("linear"), retryOptions, embeddingsService);
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.state", field_schema: "keyword" as const },
      { field_name: "metadata.priority", field_schema: "integer" as const },
      { field_name: "metadata.createdAt", field_schema: "datetime" as const },
      { field_name: "metadata.teamId", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "issue";
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<LinearIssueDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(linearIssues) as any;

      if (cursor) {
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(linearIssues.updatedAt, cursor.timestamp),
            drizzleOrm.gt(linearIssues.id, cursor.id),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(linearIssues.updatedAt), drizzleOrm.asc(linearIssues.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return { table: linearIssues, updatedAtField: linearIssues.updatedAt, idField: linearIssues.id };
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<LinearIssueDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(enriched: EnrichedEntity<LinearIssueDataTarget>): RetoveLinearIssueVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: LinearIssueDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
    };
  }
}

export interface RetoveLinearIssueVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "issue";
  } & Partial<LinearIssueDataTarget>;
}

export type RetoveLinearVectorPoint = RetoveLinearIssueVectorPoint;
