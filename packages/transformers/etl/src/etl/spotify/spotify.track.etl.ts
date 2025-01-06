import type { getPostgresClient, SpotifyTrackDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { spotifyTracks } from "@ait/postgres";
import type { IEmbeddingsService } from "@ait/langchain";
import { BaseETLAbstract, type RetryOptions } from "../etl.base.abstract";
import type { SpotifyTrackVectorPoint } from "./spotify.etl.interface";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyTrackDescriptor } from "../../infrastructure/embeddings/descriptors/spotify/etl.spotify.descriptor";

const defaultCollectionName = "spotify_tracks_collection";

export class SpotifyTrackETL extends BaseETLAbstract {
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

  protected getPayload(track: SpotifyTrackDataTarget): SpotifyTrackVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(track);
  }
}
