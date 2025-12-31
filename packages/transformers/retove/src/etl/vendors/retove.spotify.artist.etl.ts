import { type IEmbeddingsService, getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import type { SpotifyArtistDataTarget, getPostgresClient } from "@ait/postgres";
import { drizzleOrm, spotifyArtists } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyArtistDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveSpotifyArtistETL extends RetoveBaseETLAbstract<SpotifyArtistDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<SpotifyArtistDataTarget> = new ETLSpotifyArtistDescriptor();

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

  protected getTextForEmbedding(enriched: EnrichedEntity<SpotifyArtistDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(enriched: EnrichedEntity<SpotifyArtistDataTarget>): RetoveSpotifyTrackVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: SpotifyArtistDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.name", field_schema: "keyword" as const },
      { field_name: "metadata.genres", field_schema: "keyword" as const },
      { field_name: "metadata.description", field_schema: "text" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "spotify_artist";
  }
}

export interface RetoveSpotifyTrackVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "spotify_artist";
  } & Partial<SpotifyArtistDataTarget>;
}
export type RetoveSpotifyVectorPoint = RetoveSpotifyTrackVectorPoint;
