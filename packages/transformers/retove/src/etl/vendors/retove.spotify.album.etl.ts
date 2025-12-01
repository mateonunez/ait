import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import { drizzleOrm, type getPostgresClient, spotifyAlbums } from "@ait/postgres";
import type { SpotifyAlbumDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyAlbumDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import { type BaseVectorPoint, RetoveBaseETLAbstract, type RetryOptions } from "../retove.base-etl.abstract";

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

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<SpotifyAlbumDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(spotifyAlbums) as any;
      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(spotifyAlbums.updatedAt, lastProcessedTimestamp));
      }
      return query.orderBy(drizzleOrm.asc(spotifyAlbums.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(album: SpotifyAlbumDataTarget): string {
    return this._descriptor.getEmbeddingText(album);
  }

  protected getPayload(album: SpotifyAlbumDataTarget): RetoveSpotifyAlbumVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(album);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const albums = data as SpotifyAlbumDataTarget[];
    if (albums.length === 0) return new Date();
    return albums.reduce((max, album) => {
      const albumDate = album.updatedAt ? new Date(album.updatedAt) : new Date(0);
      return albumDate > max ? albumDate : max;
    }, new Date(0));
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.name", field_schema: "keyword" as const },
      { field_name: "metadata.artist", field_schema: "keyword" as const },
      { field_name: "metadata.releaseDate", field_schema: "datetime" as const },
    ];
  }

  protected override _getEntityType(): string {
    return "album";
  }
}

export interface RetoveSpotifyAlbumVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "album";
  } & Partial<SpotifyAlbumDataTarget>;
}
