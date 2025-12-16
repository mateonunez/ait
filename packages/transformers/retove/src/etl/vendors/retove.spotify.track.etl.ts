import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import type { SpotifyTrackDataTarget, getPostgresClient } from "@ait/postgres";
import { drizzleOrm, spotifyTracks } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyTrackDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveSpotifyTrackETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyTrackDataTarget> = new ETLSpotifyTrackDescriptor();

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
      { field_name: "metadata.artist", field_schema: "keyword" as const },
      { field_name: "metadata.name", field_schema: "keyword" as const },
      { field_name: "metadata.album", field_schema: "keyword" as const },
      { field_name: "metadata.addedAt", field_schema: "datetime" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "track";
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<SpotifyTrackDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(spotifyTracks) as any;

      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(spotifyTracks.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(spotifyTracks.updatedAt, cursor.timestamp),
              drizzleOrm.gt(spotifyTracks.id, cursor.id),
            ),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(spotifyTracks.updatedAt), drizzleOrm.asc(spotifyTracks.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return { table: spotifyTracks, updatedAtField: spotifyTracks.updatedAt, idField: spotifyTracks.id };
  }

  protected getTextForEmbedding(track: SpotifyTrackDataTarget): string {
    return this._descriptor.getEmbeddingText(track);
  }

  protected getPayload(track: SpotifyTrackDataTarget): RetoveSpotifyTrackVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(track);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const track = item as SpotifyTrackDataTarget;
    return {
      timestamp: track.updatedAt ? new Date(track.updatedAt) : new Date(0),
      id: track.id,
    };
  }
}

export interface RetoveSpotifyTrackVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "track";
  } & Partial<SpotifyTrackDataTarget>;
}
/**
 * Union type for Spotify vector points
 */

export type RetoveSpotifyVectorPoint = RetoveSpotifyTrackVectorPoint;
