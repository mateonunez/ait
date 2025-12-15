import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import type { SpotifyArtistDataTarget, getPostgresClient } from "@ait/postgres";
import { drizzleOrm, spotifyArtists } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyArtistDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveSpotifyArtistETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyArtistDataTarget> = new ETLSpotifyArtistDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("spotify"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<SpotifyArtistDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(spotifyArtists) as any;

      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(spotifyArtists.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(spotifyArtists.updatedAt, cursor.timestamp),
              drizzleOrm.gt(spotifyArtists.id, cursor.id),
            ),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(spotifyArtists.updatedAt), drizzleOrm.asc(spotifyArtists.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig() {
    return { table: spotifyArtists, updatedAtField: spotifyArtists.updatedAt, idField: spotifyArtists.id };
  }

  protected getTextForEmbedding(track: SpotifyArtistDataTarget): string {
    return this._descriptor.getEmbeddingText(track);
  }

  protected getPayload(track: SpotifyArtistDataTarget): RetoveSpotifyTrackVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(track);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const artist = item as SpotifyArtistDataTarget;
    return {
      timestamp: artist.updatedAt ? new Date(artist.updatedAt) : new Date(0),
      id: artist.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.name", field_schema: "keyword" as const },
      { field_name: "metadata.genres", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "artist";
  }
}

export interface RetoveSpotifyTrackVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "track";
  } & Partial<SpotifyArtistDataTarget>;
}
export type RetoveSpotifyVectorPoint = RetoveSpotifyTrackVectorPoint;
