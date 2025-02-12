import { connectorSpotifyAlbumMapper } from "@/domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "@/types/domain/entities/connector.repository.interface";
import type {
  IConnectorSpotifyAlbumRepository,
  SpotifyAlbumEntity,
} from "@/types/domain/entities/vendors/connector.spotify.types";
import { getPostgresClient, spotifyAlbums } from "@ait/postgres";
import { randomUUID } from "node:crypto";

export class ConnectorSpotifyAlbumRepository implements IConnectorSpotifyAlbumRepository {
  private _pgClient = getPostgresClient();

  async saveAlbum(
    album: SpotifyAlbumEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const albumId = incremental ? randomUUID() : album.id;

    try {
      const albumDataTarget = connectorSpotifyAlbumMapper.domainToDataTarget(album);
      albumDataTarget.id = albumId;

      await this._pgClient.db.transaction(async (tx) => {
        await tx.insert(spotifyAlbums).values(albumDataTarget).onConflictDoNothing().execute();
      });

      console.debug("Album saved successfully:", { albumId: album.id });
    } catch (error: any) {
      console.error("Failed to save album:", { albumId: album.id, error });
      throw new Error(`Failed to save album ${album.id}: ${error.message}`);
    }
  }

  async saveAlbums(albums: SpotifyAlbumEntity[]): Promise<void> {
    if (!albums.length) {
      return;
    }

    try {
      console.debug("Saving albums to Spotify repository:", { albums });

      for (const album of albums) {
        await this.saveAlbum(album, { incremental: true });
      }

      console.debug("Albums saved successfully:", { albums: albums.length });
    } catch (error) {
      console.error("Error saving albums:", error);
      throw new Error("Failed to save albums to repository");
    }
  }

  async getAlbum(id: string): Promise<SpotifyAlbumEntity | null> {
    console.log("Getting album from Spotify repository", id);
    return null;
  }

  async getAlbums(): Promise<SpotifyAlbumEntity[]> {
    console.log("Getting albums from Spotify repository");
    return [];
  }
}
