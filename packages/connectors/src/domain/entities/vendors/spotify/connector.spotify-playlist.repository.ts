import { connectorSpotifyPlaylistMapper } from "@/domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "@/types/domain/entities/connector.repository.interface";
import type {
  IConnectorSpotifyPlaylistRepository,
  SpotifyPlaylistEntity,
} from "@/types/domain/entities/vendors/connector.spotify.types";
import { getPostgresClient, spotifyPlaylists } from "@ait/postgres";
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
        await tx
          .insert(spotifyPlaylists)
          .values(playlistDataTarget)
          .onConflictDoUpdate({
            target: spotifyPlaylists.id,
            set: {
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
            },
          })
          .execute();
      });

      console.debug("Playlist saved successfully:", { playlistId: playlist.id });
    } catch (error: any) {
      console.error("Failed to save playlist:", { playlistId: playlist.id, error });
      throw new Error(`Failed to save playlist ${playlist.id}: ${error.message}`);
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

      console.debug("Playlists saved successfully:", { playlists: playlists.length });
    } catch (error) {
      console.error("Error saving playlists:", error);
      throw new Error("Failed to save playlists to repository");
    }
  }

  async getPlaylist(id: string): Promise<SpotifyPlaylistEntity | null> {
    console.log("Getting playlist from Spotify repository", id);
    return null;
  }

  async getPlaylists(): Promise<SpotifyPlaylistEntity[]> {
    console.log("Getting playlists from Spotify repository");
    return [];
  }
}
