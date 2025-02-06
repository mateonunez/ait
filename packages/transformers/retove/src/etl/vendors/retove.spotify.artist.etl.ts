import type { getPostgresClient, SpotifyArtistDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { spotifyArtists } from "@ait/postgres";
import type { IEmbeddingsService } from "@ait/langchain";
import { RetoveBaseETLAbstract, type BaseVectorPoint, type RetryOptions } from "../retove.base-etl.abstract";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyArtistDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";

const defaultCollectionName = "spotify_tracks_collection";

export class RetoveSpotifyArtistETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyArtistDataTarget> = new ETLSpotifyArtistDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, defaultCollectionName, retryOptions, embeddingsService);
  }

  protected async extract(limit: number): Promise<SpotifyArtistDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(spotifyArtists).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(track: SpotifyArtistDataTarget): string {
    return this._descriptor.getEmbeddingText(track);
  }

  protected getPayload(track: SpotifyArtistDataTarget): RetoveSpotifyTrackVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(track);
  }
}

export interface RetoveSpotifyTrackVectorPoint extends BaseVectorPoint {
  payload: {
    type: "track";
  } & Partial<SpotifyArtistDataTarget>;
}
/**
 * Union type for Spotify vector points
 */

export type RetoveSpotifyVectorPoint = RetoveSpotifyTrackVectorPoint;
