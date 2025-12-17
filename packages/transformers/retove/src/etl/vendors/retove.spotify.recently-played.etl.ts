import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import type { SpotifyRecentlyPlayedDataTarget, getPostgresClient } from "@ait/postgres";
import { drizzleOrm, spotifyRecentlyPlayed } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyRecentlyPlayedDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveSpotifyRecentlyPlayedETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyRecentlyPlayedDataTarget> =
    new ETLSpotifyRecentlyPlayedDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("spotify"), retryOptions, embeddingsService);
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.playedAt", field_schema: "datetime" as const },
      { field_name: "metadata.artist", field_schema: "keyword" as const },
      { field_name: "metadata.trackName", field_schema: "keyword" as const },
      { field_name: "metadata.album", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "recently_played";
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<SpotifyRecentlyPlayedDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(spotifyRecentlyPlayed) as any;
      if (cursor) {
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(spotifyRecentlyPlayed.updatedAt, cursor.timestamp),
            drizzleOrm.gt(spotifyRecentlyPlayed.id, cursor.id),
          ),
        );
      }
      return query
        .orderBy(drizzleOrm.asc(spotifyRecentlyPlayed.updatedAt), drizzleOrm.asc(spotifyRecentlyPlayed.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig {
    return {
      table: spotifyRecentlyPlayed,
      updatedAtField: spotifyRecentlyPlayed.updatedAt,
      idField: spotifyRecentlyPlayed.id,
    };
  }

  protected getTextForEmbedding(item: SpotifyRecentlyPlayedDataTarget): string {
    return this._descriptor.getEmbeddingText(item);
  }

  protected getPayload(item: SpotifyRecentlyPlayedDataTarget): RetoveSpotifyRecentlyPlayedVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(item);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const record = item as SpotifyRecentlyPlayedDataTarget;
    return {
      timestamp: record.updatedAt ? new Date(record.updatedAt) : new Date(0),
      id: record.id,
    };
  }
}

export interface RetoveSpotifyRecentlyPlayedVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "recently_played";
  } & Partial<SpotifyRecentlyPlayedDataTarget>;
}
