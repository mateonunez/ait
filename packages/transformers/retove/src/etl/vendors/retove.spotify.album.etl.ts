import type { qdrant } from "@ait/qdrant";
import { spotifyAlbums, type getPostgresClient } from "@ait/postgres";
import type { SpotifyAlbumDataTarget } from "@ait/postgres";
import { type BaseVectorPoint, RetoveBaseETLAbstract, type RetryOptions } from "../retove.base-etl.abstract";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import { ETLSpotifyAlbumDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import { getCollectionNameByVendor } from "@ait/ai-sdk";

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

  protected async extract(limit: number): Promise<SpotifyAlbumDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(spotifyAlbums).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(album: SpotifyAlbumDataTarget): string {
    return this._descriptor.getEmbeddingText(album);
  }

  protected getPayload(album: SpotifyAlbumDataTarget): RetoveSpotifyAlbumVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(album);
  }

  protected override getIdBaseOffset(): number {
    return 4_000_000_000_000; // namespace for albums
  }
}

export interface RetoveSpotifyAlbumVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "album";
  } & Partial<SpotifyAlbumDataTarget>;
}
