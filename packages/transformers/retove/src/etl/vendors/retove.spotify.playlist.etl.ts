import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { drizzleOrm, type getPostgresClient, spotifyPlaylists } from "@ait/postgres";
import type { SpotifyPlaylistDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyPlaylistDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveSpotifyPlaylistETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyPlaylistDataTarget> = new ETLSpotifyPlaylistDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("spotify"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<SpotifyPlaylistDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(spotifyPlaylists) as any;

      if (cursor) {
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(spotifyPlaylists.updatedAt, cursor.timestamp),
            drizzleOrm.gt(spotifyPlaylists.id, cursor.id),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(spotifyPlaylists.updatedAt), drizzleOrm.asc(spotifyPlaylists.id))
        .limit(limit)
        .execute();
    });
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return { table: spotifyPlaylists, updatedAtField: spotifyPlaylists.updatedAt, idField: spotifyPlaylists.id };
  }

  protected getTextForEmbedding(playlist: SpotifyPlaylistDataTarget): string {
    return this._descriptor.getEmbeddingText(playlist);
  }

  protected getPayload(playlist: SpotifyPlaylistDataTarget): RetoveSpotifyPlaylistVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(playlist);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const playlist = item as SpotifyPlaylistDataTarget;
    return {
      timestamp: playlist.updatedAt ? new Date(playlist.updatedAt) : new Date(0),
      id: playlist.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.name", field_schema: "keyword" as const },
      { field_name: "metadata.owner", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "playlist";
  }
}

export interface RetoveSpotifyPlaylistVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "playlist";
  } & Partial<SpotifyPlaylistDataTarget>;
}
