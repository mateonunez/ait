import type { getPostgresClient, SpotifyTrackDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { spotifyTracks } from "@ait/postgres";
import type { IEmbeddingsService } from "../../infrastructure/embeddings/etl.embeddings.service";
import type { RetryOptions } from "../etl.abstract";
import type { SpotifyTrackVectorPoint } from "./spotify.etl.interface";
import { ETLBase } from "../etl.base";

const defaultCollectionName = "spotify_tracks_collection";

export class SpotifyTrackETL extends ETLBase {
  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService
  ) {
    super(
      pgClient,
      qdrantClient,
      defaultCollectionName,
      retryOptions,
      embeddingsService
    );
  }

  protected async extract(limit: number): Promise<SpotifyTrackDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(spotifyTracks).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(track: SpotifyTrackDataTarget): string {
    return `${track.name} ${track.artist}`;
  }

  protected getPayload(
    track: SpotifyTrackDataTarget
  ): SpotifyTrackVectorPoint["payload"] {
    return {
      type: "track",
      ...track,
    };
  }
}
