import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { drizzleOrm, type getPostgresClient, spotifyAlbums } from "@ait/postgres";
import type { SpotifyAlbumDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyAlbumDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveSpotifyAlbumETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyAlbumDataTarget> = new ETLSpotifyAlbumDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("spotify"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<SpotifyAlbumDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(spotifyAlbums) as any;

      if (cursor) {
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(spotifyAlbums.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(spotifyAlbums.updatedAt, cursor.timestamp),
              drizzleOrm.gt(spotifyAlbums.id, cursor.id),
            ),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(spotifyAlbums.updatedAt), drizzleOrm.asc(spotifyAlbums.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig() {
    return { table: spotifyAlbums, updatedAtField: spotifyAlbums.updatedAt, idField: spotifyAlbums.id };
  }

  protected getTextForEmbedding(album: SpotifyAlbumDataTarget): string {
    return this._descriptor.getEmbeddingText(album);
  }

  protected getPayload(album: SpotifyAlbumDataTarget): RetoveSpotifyAlbumVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(album);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const album = item as SpotifyAlbumDataTarget;
    return {
      timestamp: album.updatedAt ? new Date(album.updatedAt) : new Date(0),
      id: album.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.name", field_schema: "keyword" as const },
      { field_name: "metadata.artist", field_schema: "keyword" as const },
      { field_name: "metadata.releaseDate", field_schema: "datetime" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "album";
  }
}

export interface RetoveSpotifyAlbumVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "album";
  } & Partial<SpotifyAlbumDataTarget>;
}
