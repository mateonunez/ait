import { type IEmbeddingsService, getCollectionNameByVendor } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { drizzleOrm, type getPostgresClient, spotifyAlbums } from "@ait/postgres";
import type { SpotifyAlbumDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type {
  EnrichedEntity,
  IETLEmbeddingDescriptor,
} from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyAlbumDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveSpotifyAlbumETL extends RetoveBaseETLAbstract<SpotifyAlbumDataTarget> {
  protected readonly _descriptor: IETLEmbeddingDescriptor<SpotifyAlbumDataTarget> = new ETLSpotifyAlbumDescriptor();

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
        // Use >= for timestamp combined with > for ID to handle microsecond precision loss
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(spotifyAlbums.updatedAt, cursor.timestamp),
            drizzleOrm.gt(spotifyAlbums.id, cursor.id),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(spotifyAlbums.updatedAt), drizzleOrm.asc(spotifyAlbums.id))
        .limit(limit)
        .execute();
    });
  }

  protected getTextForEmbedding(enriched: EnrichedEntity<SpotifyAlbumDataTarget>): string {
    return this._descriptor.getEmbeddingText(enriched);
  }

  protected getPayload(enriched: EnrichedEntity<SpotifyAlbumDataTarget>): RetoveSpotifyAlbumVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(enriched);
  }

  protected getCursorFromItem(item: SpotifyAlbumDataTarget): ETLCursor {
    return {
      timestamp: item.updatedAt ? new Date(item.updatedAt) : new Date(0),
      id: item.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.name", field_schema: "keyword" as const },
      { field_name: "metadata.artist", field_schema: "keyword" as const },
      { field_name: "metadata.releaseDate", field_schema: "datetime" as const },
      { field_name: "metadata.description", field_schema: "text" as const },
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
