import type { getPostgresClient, SpotifyArtistDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { spotifyArtists } from "@ait/postgres";
import type { IEmbeddingsService } from "@ait/langchain";
import { RetoveBaseETLAbstract, type BaseVectorPoint, type RetryOptions } from "../retove.base-etl.abstract";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyArtistDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import { RETOVE_COLLECTION_NAME } from "@/config/retove.config";

export class RetoveSpotifyArtistETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyArtistDataTarget> = new ETLSpotifyArtistDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, RETOVE_COLLECTION_NAME, retryOptions, embeddingsService);
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

  protected override getIdBaseOffset(): number {
    return 2_000_000_000_000;
  }
}

export interface RetoveSpotifyTrackVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "track";
  } & Partial<SpotifyArtistDataTarget>;
}
/**
 * Union type for Spotify vector points
 */

export type RetoveSpotifyVectorPoint = RetoveSpotifyTrackVectorPoint;
