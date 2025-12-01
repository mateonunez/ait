import type { IEmbeddingsService } from "@ait/ai-sdk";
import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { SpotifyArtistDataTarget, getPostgresClient } from "@ait/postgres";
import { drizzleOrm, spotifyArtists } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyArtistDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import { type BaseVectorPoint, RetoveBaseETLAbstract, type RetryOptions } from "../retove.base-etl.abstract";

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

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<SpotifyArtistDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(spotifyArtists) as any;
      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(spotifyArtists.updatedAt, lastProcessedTimestamp));
      }
      return query.orderBy(drizzleOrm.asc(spotifyArtists.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(track: SpotifyArtistDataTarget): string {
    return this._descriptor.getEmbeddingText(track);
  }

  protected getPayload(track: SpotifyArtistDataTarget): RetoveSpotifyTrackVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(track);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const artists = data as SpotifyArtistDataTarget[];
    if (artists.length === 0) return new Date();
    return artists.reduce((max, artist) => {
      const artistDate = artist.updatedAt ? new Date(artist.updatedAt) : new Date(0);
      return artistDate > max ? artistDate : max;
    }, new Date(0));
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.name", field_schema: "keyword" as const },
      { field_name: "metadata.genres", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): string {
    return "artist";
  }
}

export interface RetoveSpotifyTrackVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "track";
  } & Partial<SpotifyArtistDataTarget>;
}
export type RetoveSpotifyVectorPoint = RetoveSpotifyTrackVectorPoint;
