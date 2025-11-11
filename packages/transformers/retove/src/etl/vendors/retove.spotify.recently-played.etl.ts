import type { getPostgresClient, SpotifyRecentlyPlayedDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { spotifyRecentlyPlayed } from "@ait/postgres";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import { RetoveBaseETLAbstract, type BaseVectorPoint, type RetryOptions } from "../retove.base-etl.abstract";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLSpotifyRecentlyPlayedDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import { getCollectionNameByVendor } from "@ait/ai-sdk";

export class RetoveSpotifyRecentlyPlayedETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyRecentlyPlayedDataTarget> =
    new ETLSpotifyRecentlyPlayedDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("spotify"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number): Promise<SpotifyRecentlyPlayedDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      return tx.select().from(spotifyRecentlyPlayed).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(item: SpotifyRecentlyPlayedDataTarget): string {
    return this._descriptor.getEmbeddingText(item);
  }

  protected getPayload(item: SpotifyRecentlyPlayedDataTarget): RetoveSpotifyRecentlyPlayedVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(item);
  }

  protected override getIdBaseOffset(): number {
    return 5_000_000_000_000; // Unique offset for recently played
  }
}

export interface RetoveSpotifyRecentlyPlayedVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "recently_played";
  } & Partial<SpotifyRecentlyPlayedDataTarget>;
}
