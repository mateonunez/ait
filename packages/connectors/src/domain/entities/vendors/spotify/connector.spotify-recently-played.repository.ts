import { randomUUID } from "node:crypto";
import {
  AItError,
  type PaginatedResponse,
  type PaginationParams,
  SpotifyRecentlyPlayedEntity,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to save recently played item:", { itemId: item.id, error: message });
      throw new AItError(
        "SPOTIFY_SAVE_RECENTLY_PLAYED",
        `Failed to save recently played item ${item.id}: ${message}`,
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
    const { limit, offset } = getPaginationOffset(params);

    const [recentlyPlayed, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(spotifyRecentlyPlayed)
        .orderBy(drizzleOrm.desc(spotifyRecentlyPlayed.playedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(spotifyRecentlyPlayed),
    ]);

    return buildPaginatedResponse(
      recentlyPlayed.map((item) => SpotifyRecentlyPlayedEntity.fromPlain(item as SpotifyRecentlyPlayedDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}
