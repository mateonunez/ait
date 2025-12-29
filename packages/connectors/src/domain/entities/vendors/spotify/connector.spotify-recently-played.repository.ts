import { randomUUID } from "node:crypto";
import {
  AItError,
  type PaginatedResponse,
  type PaginationParams,
  SpotifyRecentlyPlayedEntity,
  getLogger,
} from "@ait/core";
import {
  type SpotifyRecentlyPlayedDataTarget,
  drizzleOrm,
  getPostgresClient,
  spotifyRecentlyPlayed,
} from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSpotifyRecentlyPlayedRepository } from "../../../../types/domain/entities/vendors/connector.spotify.types";

const logger = getLogger();

export class ConnectorSpotifyRecentlyPlayedRepository implements IConnectorSpotifyRecentlyPlayedRepository {
  private _pgClient = getPostgresClient();

  async saveRecentlyPlayed(
    item: SpotifyRecentlyPlayedEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const itemId = incremental ? randomUUID() : item.id;

    try {
      const itemDataTarget = item.toPlain<SpotifyRecentlyPlayedDataTarget>();
      itemDataTarget.id = itemId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<SpotifyRecentlyPlayedDataTarget> = {
          trackId: itemDataTarget.trackId,
          trackName: itemDataTarget.trackName,
          artist: itemDataTarget.artist,
          album: itemDataTarget.album,
          durationMs: itemDataTarget.durationMs,
          explicit: itemDataTarget.explicit,
          popularity: itemDataTarget.popularity,
          playedAt: itemDataTarget.playedAt,
          context: itemDataTarget.context as any,
          updatedAt: new Date(),
        };

        await tx
          .insert(spotifyRecentlyPlayed)
          .values(itemDataTarget as any)
          .onConflictDoUpdate({
            target: spotifyRecentlyPlayed.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      logger.error("Failed to save recently played item:", { itemId: item.id, error });
      throw new AItError(
        "SPOTIFY_SAVE_RECENTLY_PLAYED",
        `Failed to save recently played item ${item.id}: ${error.message}`,
        { id: item.id },
        error,
      );
    }
  }

  async saveRecentlyPlayedBatch(items: SpotifyRecentlyPlayedEntity[]): Promise<void> {
    if (!items.length) {
      return;
    }

    try {
      for (const item of items) {
        await this.saveRecentlyPlayed(item, { incremental: false });
      }
    } catch (error) {
      logger.error("Error saving recently played items:", { error });
      throw new AItError("SPOTIFY_SAVE_RECENTLY_PLAYED_BULK", "Failed to save recently played items to repository");
    }
  }

  async fetchRecentlyPlayed(limit = 20): Promise<SpotifyRecentlyPlayedEntity[]> {
    const results = await this._pgClient.db
      .select()
      .from(spotifyRecentlyPlayed)
      .orderBy(drizzleOrm.desc(spotifyRecentlyPlayed.playedAt))
      .limit(limit)
      .execute();

    return results.map((result) => SpotifyRecentlyPlayedEntity.fromPlain(result as SpotifyRecentlyPlayedDataTarget));
  }

  async getRecentlyPlayedById(id: string): Promise<SpotifyRecentlyPlayedEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(spotifyRecentlyPlayed)
      .where(drizzleOrm.eq(spotifyRecentlyPlayed.id, id))
      .limit(1)
      .execute();

    if (result.length > 0 && result[0]) {
      return SpotifyRecentlyPlayedEntity.fromPlain(result[0] as SpotifyRecentlyPlayedDataTarget);
    }

    return null;
  }

  async getRecentlyPlayedPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyRecentlyPlayedEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [recentlyPlayed, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(spotifyRecentlyPlayed)
        .orderBy(drizzleOrm.desc(spotifyRecentlyPlayed.playedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(spotifyRecentlyPlayed),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: recentlyPlayed.map((item) =>
        SpotifyRecentlyPlayedEntity.fromPlain(item as SpotifyRecentlyPlayedDataTarget),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
