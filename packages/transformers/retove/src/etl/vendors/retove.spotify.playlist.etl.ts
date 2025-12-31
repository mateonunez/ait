import { type IEmbeddingsService, getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { drizzleOrm, type getPostgresClient, spotifyPlaylists } from "@ait/postgres";
import type { SpotifyPlaylistDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyPlaylistDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveSpotifyPlaylistETL extends RetoveBaseETLAbstract<SpotifyPlaylistDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<SpotifyPlaylistDataTarget> =
    new ETLSpotifyPlaylistDescriptor();

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
        query = query.where(
          drizzleOrm.or(
            drizzleOrm.gt(spotifyPlaylists.updatedAt, cursor.timestamp),
            drizzleOrm.and(
              drizzleOrm.eq(spotifyPlaylists.updatedAt, cursor.timestamp),
              drizzleOrm.gt(spotifyPlaylists.id, cursor.id),
            ),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(spotifyPlaylists.updatedAt), drizzleOrm.asc(spotifyPlaylists.id))
        .limit(limit)
        .execute();
    });
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<SpotifyPlaylistDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(
    enriched: EnrichedEntity<SpotifyPlaylistDataTarget>,
  ): RetoveSpotifyPlaylistVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: SpotifyPlaylistDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.name", field_schema: "keyword" as const },
      { field_name: "metadata.owner", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "spotify_playlist";
  }
}

export interface RetoveSpotifyPlaylistVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "spotify_playlist";
  } & Partial<SpotifyPlaylistDataTarget>;
}
