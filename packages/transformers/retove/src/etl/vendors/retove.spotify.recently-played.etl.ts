import type { getPostgresClient, SpotifyRecentlyPlayedDataTarget } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { spotifyRecentlyPlayed, drizzleOrm } from "@ait/postgres";
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

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.playedAt", field_schema: "datetime" as const },
      { field_name: "metadata.artist", field_schema: "keyword" as const },
      { field_name: "metadata.trackName", field_schema: "keyword" as const },
      { field_name: "metadata.album", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): string {
    return "recently_played";
  }

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<SpotifyRecentlyPlayedDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(spotifyRecentlyPlayed) as any;
      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(spotifyRecentlyPlayed.updatedAt, lastProcessedTimestamp));
      }
      return query.orderBy(drizzleOrm.asc(spotifyRecentlyPlayed.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(item: SpotifyRecentlyPlayedDataTarget): string {
    return this._descriptor.getEmbeddingText(item);
  }

  protected getPayload(item: SpotifyRecentlyPlayedDataTarget): RetoveSpotifyRecentlyPlayedVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(item);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const items = data as SpotifyRecentlyPlayedDataTarget[];
    if (items.length === 0) return new Date();
    return items.reduce((max, item) => {
      const itemDate = item.updatedAt ? new Date(item.updatedAt) : new Date(0);
      return itemDate > max ? itemDate : max;
    }, new Date(0));
  }
}

export interface RetoveSpotifyRecentlyPlayedVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "recently_played";
  } & Partial<SpotifyRecentlyPlayedDataTarget>;
}
