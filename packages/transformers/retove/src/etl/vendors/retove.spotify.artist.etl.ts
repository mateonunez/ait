import type { getPostgresClient, SpotifyArtistDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { spotifyArtists, drizzleOrm } from "@ait/postgres";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import { RetoveBaseETLAbstract, type BaseVectorPoint, type RetryOptions } from "../retove.base-etl.abstract";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyArtistDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import { getCollectionNameByVendor } from "@ait/ai-sdk";

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

  protected getIdBaseOffset(): number {
    return 2_000_000_000_000;
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const artists = data as SpotifyArtistDataTarget[];
    if (artists.length === 0) return new Date();
    return artists.reduce((max, artist) => {
      const artistDate = artist.updatedAt ? new Date(artist.updatedAt) : new Date(0);
      return artistDate > max ? artistDate : max;
    }, new Date(0));
  }
}

export interface RetoveSpotifyTrackVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "track";
  } & Partial<SpotifyArtistDataTarget>;
}
export type RetoveSpotifyVectorPoint = RetoveSpotifyTrackVectorPoint;
