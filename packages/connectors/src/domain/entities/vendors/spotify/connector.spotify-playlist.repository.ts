import { AItError, type SpotifyPlaylistEntity, type PaginatedResponse, type PaginationParams } from "@ait/core";
import { connectorSpotifyPlaylistMapper } from "../../../../domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSpotifyPlaylistRepository } from "../../../../types/domain/entities/vendors/connector.spotify.types";
import { getPostgresClient, spotifyPlaylists, type SpotifyPlaylistDataTarget, drizzleOrm } from "@ait/postgres";
import { randomUUID } from "node:crypto";

export class ConnectorSpotifyPlaylistRepository implements IConnectorSpotifyPlaylistRepository {
  private _pgClient = getPostgresClient();

  async savePlaylist(
    playlist: SpotifyPlaylistEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const playlistId = incremental ? randomUUID() : playlist.id;

    try {
      const playlistDataTarget = connectorSpotifyPlaylistMapper.domainToDataTarget(playlist);
      playlistDataTarget.id = playlistId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<SpotifyPlaylistDataTarget> = {
          name: playlistDataTarget.name,
          description: playlistDataTarget.description,
          public: playlistDataTarget.public,
          collaborative: playlistDataTarget.collaborative,
          owner: playlistDataTarget.owner,
          tracks: playlistDataTarget.tracks,
          followers: playlistDataTarget.followers,
          snapshotId: playlistDataTarget.snapshotId,
          uri: playlistDataTarget.uri,
          href: playlistDataTarget.href,
          externalUrls: playlistDataTarget.externalUrls,
          updatedAt: new Date(),
        };

        await tx
          .insert(spotifyPlaylists)
          .values(playlistDataTarget)
          .onConflictDoUpdate({
            target: spotifyPlaylists.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      console.error("Failed to save playlist:", { playlistId: playlist.id, error });
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
      console.debug("Saving playlists to Spotify repository:", { playlists });

      for (const playlist of playlists) {
        await this.savePlaylist(playlist, { incremental: false });
      }
    } catch (error) {
      console.error("Error saving playlists:", error);
      throw new AItError("SPOTIFY_SAVE_PLAYLIST_BULK", "Failed to save playlists to repository");
    }
  }

  async getPlaylist(id: string): Promise<SpotifyPlaylistEntity | null> {
    console.log("Getting playlist from Spotify repository", id);
    return null;
  }

  async fetchPlaylists(): Promise<SpotifyPlaylistEntity[]> {
    console.log("Getting playlists from Spotify repository");
    return [];
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
      data: playlists.map((playlist) => connectorSpotifyPlaylistMapper.dataTargetToDomain(playlist)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
