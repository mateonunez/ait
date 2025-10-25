import { connectorSpotifyRecentlyPlayedMapper } from "../../../../domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type {
  IConnectorSpotifyRecentlyPlayedRepository,
  SpotifyRecentlyPlayedEntity,
} from "../../../../types/domain/entities/vendors/connector.spotify.types";
import { getPostgresClient, spotifyRecentlyPlayed } from "@ait/postgres";
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
        await tx
          .insert(spotifyRecentlyPlayed)
          .values(itemDataTarget)
          .onConflictDoUpdate({
            target: spotifyRecentlyPlayed.id,
            set: {
              trackId: itemDataTarget.trackId,
              trackName: itemDataTarget.trackName,
              artist: itemDataTarget.artist,
              album: itemDataTarget.album,
              durationMs: itemDataTarget.durationMs,
              explicit: itemDataTarget.explicit,
              popularity: itemDataTarget.popularity,
              playedAt: itemDataTarget.playedAt,
              context: itemDataTarget.context,
              updatedAt: new Date(),
            },
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

  async getRecentlyPlayed(limit?: number): Promise<SpotifyRecentlyPlayedEntity[]> {
    console.log("Getting recently played from Spotify repository", limit);
    return [];
  }

  async getRecentlyPlayedById(id: string): Promise<SpotifyRecentlyPlayedEntity | null> {
    console.log("Getting recently played item by id from Spotify repository", id);
    return null;
  }
}
