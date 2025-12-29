import { randomUUID } from "node:crypto";
import { AItError, type PaginatedResponse, type PaginationParams, SpotifyPlaylistEntity, getLogger } from "@ait/core";
import { type SpotifyPlaylistDataTarget, drizzleOrm, getPostgresClient, spotifyPlaylists } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSpotifyPlaylistRepository } from "../../../../types/domain/entities/vendors/connector.spotify.types";

const logger = getLogger();

export class ConnectorSpotifyPlaylistRepository implements IConnectorSpotifyPlaylistRepository {
  private _pgClient = getPostgresClient();

  async savePlaylist(
    playlist: SpotifyPlaylistEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const playlistId = incremental ? randomUUID() : playlist.id;

    try {
      const playlistDataTarget = playlist.toPlain<SpotifyPlaylistDataTarget>();
      playlistDataTarget.id = playlistId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<SpotifyPlaylistDataTarget> = {
          name: playlistDataTarget.name,
          description: playlistDataTarget.description,
          public: playlistDataTarget.public,
          collaborative: playlistDataTarget.collaborative,
          owner: playlistDataTarget.owner as any,
          tracks: playlistDataTarget.tracks as any,
          followers: playlistDataTarget.followers as any,
          snapshotId: playlistDataTarget.snapshotId,
          uri: playlistDataTarget.uri,
          href: playlistDataTarget.href,
          externalUrls: playlistDataTarget.externalUrls as any,
          updatedAt: new Date(),
        };

        await tx
          .insert(spotifyPlaylists)
          .values(playlistDataTarget as any)
          .onConflictDoUpdate({
            target: spotifyPlaylists.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      logger.error("Failed to save playlist:", { playlistId: playlist.id, error });
      throw new AItError(
        "SPOTIFY_SAVE_PLAYLIST",
        `Failed to save playlist ${playlist.id}: ${error.message}`,
        { id: playlist.id },
        error,
      );
    }
  }

  async savePlaylists(playlists: SpotifyPlaylistEntity[]): Promise<void> {
    if (!playlists.length) {
      return;
    }

    try {
      for (const playlist of playlists) {
        await this.savePlaylist(playlist, { incremental: false });
      }
    } catch (error) {
      logger.error("Error saving playlists:", { error });
      throw new AItError("SPOTIFY_SAVE_PLAYLIST_BULK", "Failed to save playlists to repository");
    }
  }

  async getPlaylist(id: string): Promise<SpotifyPlaylistEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(spotifyPlaylists)
      .where(drizzleOrm.eq(spotifyPlaylists.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return SpotifyPlaylistEntity.fromPlain(result[0]! as SpotifyPlaylistDataTarget);
  }

  async fetchPlaylists(): Promise<SpotifyPlaylistEntity[]> {
    const playlists = await this._pgClient.db.select().from(spotifyPlaylists);
    return playlists.map((playlist) => SpotifyPlaylistEntity.fromPlain(playlist as SpotifyPlaylistDataTarget));
  }

  async getPlaylistsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyPlaylistEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [playlists, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(spotifyPlaylists)
        .orderBy(drizzleOrm.desc(spotifyPlaylists.updatedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(spotifyPlaylists),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: playlists.map((playlist) => SpotifyPlaylistEntity.fromPlain(playlist as SpotifyPlaylistDataTarget)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
