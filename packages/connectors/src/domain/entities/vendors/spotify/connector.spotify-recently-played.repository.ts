import { connectorSpotifyRecentlyPlayedMapper } from "../../../../domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type {
  IConnectorSpotifyRecentlyPlayedRepository,
  SpotifyRecentlyPlayedEntity,
} from "../../../../types/domain/entities/vendors/connector.spotify.types";
import {
  getPostgresClient,
  spotifyRecentlyPlayed,
  type SpotifyRecentlyPlayedDataTarget,
  drizzleOrm,
} from "@ait/postgres";
import { randomUUID } from "node:crypto";

export class ConnectorSpotifyRecentlyPlayedRepository implements IConnectorSpotifyRecentlyPlayedRepository {
  private _pgClient = getPostgresClient();

  async saveRecentlyPlayed(
    item: SpotifyRecentlyPlayedEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const itemId = incremental ? randomUUID() : item.id;

    try {
      const itemDataTarget = connectorSpotifyRecentlyPlayedMapper.domainToDataTarget(item);
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
          context: itemDataTarget.context,
          updatedAt: itemDataTarget.updatedAt ?? new Date(),
        };

        if (itemDataTarget.createdAt) {
          updateValues.createdAt = itemDataTarget.createdAt;
        }

        await tx
          .insert(spotifyRecentlyPlayed)
          .values(itemDataTarget)
          .onConflictDoUpdate({
            target: spotifyRecentlyPlayed.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      console.error("Failed to save recently played item:", { itemId: item.id, error });
      throw new Error(`Failed to save recently played item ${item.id}: ${error.message}`);
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
      console.error("Error saving recently played items:", error);
      throw new Error("Failed to save recently played items to repository");
    }
  }

  async getRecentlyPlayed(limit = 20): Promise<SpotifyRecentlyPlayedEntity[]> {
    const results = await this._pgClient.db
      .select()
      .from(spotifyRecentlyPlayed)
      .orderBy(drizzleOrm.desc(spotifyRecentlyPlayed.playedAt))
      .limit(limit)
      .execute();

    return results.map((result) => connectorSpotifyRecentlyPlayedMapper.dataTargetToDomain(result));
  }

  async getRecentlyPlayedById(id: string): Promise<SpotifyRecentlyPlayedEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(spotifyRecentlyPlayed)
      .where(drizzleOrm.eq(spotifyRecentlyPlayed.id, id))
      .limit(1)
      .execute();

    if (result.length > 0 && result[0]) {
      return connectorSpotifyRecentlyPlayedMapper.dataTargetToDomain(result[0]);
    }

    return null;
  }
}
