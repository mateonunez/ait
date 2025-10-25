import type { qdrant } from "@ait/qdrant";
import { spotifyPlaylists, type getPostgresClient } from "@ait/postgres";
import type { SpotifyPlaylistDataTarget } from "@ait/postgres";
import { type BaseVectorPoint, RetoveBaseETLAbstract, type RetryOptions } from "../retove.base-etl.abstract";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import { ETLSpotifyPlaylistDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import { RETOVE_COLLECTION_NAME } from "../../config/retove.config";

export class RetoveSpotifyPlaylistETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyPlaylistDataTarget> = new ETLSpotifyPlaylistDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, RETOVE_COLLECTION_NAME, retryOptions, embeddingsService);
  }

  protected async extract(limit: number): Promise<SpotifyPlaylistDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(spotifyPlaylists).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(playlist: SpotifyPlaylistDataTarget): string {
    return this._descriptor.getEmbeddingText(playlist);
  }

  protected getPayload(playlist: SpotifyPlaylistDataTarget): RetoveSpotifyPlaylistVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(playlist);
  }

  protected override getIdBaseOffset(): number {
    return 3_000_000_000_000;
  }
}

export interface RetoveSpotifyPlaylistVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "playlist";
  } & Partial<SpotifyPlaylistDataTarget>;
}
