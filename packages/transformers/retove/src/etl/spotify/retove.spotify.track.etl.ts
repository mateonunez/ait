import type { getPostgresClient, SpotifyTrackDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { spotifyTracks } from "@ait/postgres";
import type { IEmbeddingsService } from "@ait/langchain";
import { RetoveBaseETLAbstract, type RetryOptions } from "../retove.base-etl.abstract";
import type { RetoveSpotifyTrackVectorPoint } from "./retove.spotify.etl.interface";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyTrackDescriptor } from "../../infrastructure/embeddings/descriptors/spotify/etl.spotify.descriptor";

const defaultCollectionName = "spotify_tracks_collection";

export class RetoveSpotifyTrackETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyTrackDataTarget> = new ETLSpotifyTrackDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, defaultCollectionName, retryOptions, embeddingsService);
  }

  protected async extract(limit: number): Promise<SpotifyTrackDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(spotifyTracks).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(track: SpotifyTrackDataTarget): string {
    return this._descriptor.getEmbeddingText(track);
  }

  protected getPayload(track: SpotifyTrackDataTarget): RetoveSpotifyTrackVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(track);
  }
}
