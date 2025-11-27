import type { qdrant } from "@ait/qdrant";
import { spotifyPlaylists, type getPostgresClient, drizzleOrm } from "@ait/postgres";
import type { SpotifyPlaylistDataTarget } from "@ait/postgres";
import { type BaseVectorPoint, RetoveBaseETLAbstract, type RetryOptions } from "../retove.base-etl.abstract";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import { ETLSpotifyPlaylistDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.spotify.descriptor";
import { getCollectionNameByVendor } from "@ait/ai-sdk";

export class RetoveSpotifyPlaylistETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<SpotifyPlaylistDataTarget> = new ETLSpotifyPlaylistDescriptor();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("spotify"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, lastProcessedTimestamp?: Date): Promise<SpotifyPlaylistDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(spotifyPlaylists) as any;

      if (lastProcessedTimestamp) {
        query = query.where(drizzleOrm.gt(spotifyPlaylists.updatedAt, lastProcessedTimestamp));
      }

      return query.orderBy(drizzleOrm.asc(spotifyPlaylists.updatedAt)).limit(limit).execute();
    });
  }

  protected getTextForEmbedding(playlist: SpotifyPlaylistDataTarget): string {
    return this._descriptor.getEmbeddingText(playlist);
  }

  protected getPayload(playlist: SpotifyPlaylistDataTarget): RetoveSpotifyPlaylistVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(playlist);
  }

  protected getLatestTimestamp(data: unknown[]): Date {
    const playlists = data as SpotifyPlaylistDataTarget[];
    if (playlists.length === 0) return new Date();
    return playlists.reduce((max, playlist) => {
      const playlistDate = playlist.updatedAt ? new Date(playlist.updatedAt) : new Date(0);
      return playlistDate > max ? playlistDate : max;
    }, new Date(0));
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.name", field_schema: "keyword" as const },
      { field_name: "metadata.owner", field_schema: "keyword" as const },
    ];
  }

  protected override _getEntityType(): string {
    return "playlist";
  }
}

export interface RetoveSpotifyPlaylistVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "playlist";
  } & Partial<SpotifyPlaylistDataTarget>;
}
