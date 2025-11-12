import { AItError, type SpotifyAlbumEntity } from "@ait/core";
import { connectorSpotifyAlbumMapper } from "../../../../domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSpotifyAlbumRepository } from "../../../../types/domain/entities/vendors/connector.spotify.types";
import { getPostgresClient, spotifyAlbums, type SpotifyAlbumDataTarget } from "@ait/postgres";
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
        const updateValues: Partial<SpotifyAlbumDataTarget> = {
          name: albumDataTarget.name,
          albumType: albumDataTarget.albumType,
          artists: albumDataTarget.artists,
          tracks: albumDataTarget.tracks,
          totalTracks: albumDataTarget.totalTracks,
          releaseDate: albumDataTarget.releaseDate,
          releaseDatePrecision: albumDataTarget.releaseDatePrecision,
          isPlayable: albumDataTarget.isPlayable,
          uri: albumDataTarget.uri,
          href: albumDataTarget.href,
          popularity: albumDataTarget.popularity,
          label: albumDataTarget.label,
          copyrights: albumDataTarget.copyrights,
          externalIds: albumDataTarget.externalIds,
          genres: albumDataTarget.genres,
          updatedAt: new Date(),
        };

        await tx
          .insert(spotifyAlbums)
          .values(albumDataTarget)
          .onConflictDoUpdate({
            target: spotifyAlbums.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      console.error("Failed to save album:", { albumId: album.id, error });
      throw new AItError(
        "SPOTIFY_SAVE_ALBUM",
        `Failed to save album ${album.id}: ${error.message}`,
        { id: album.id },
        error,
      );
    }
  }

  async saveAlbums(albums: SpotifyAlbumEntity[]): Promise<void> {
    if (!albums.length) {
      return;
    }

    try {
      for (const album of albums) {
        await this.saveAlbum(album, { incremental: false });
      }
    } catch (error) {
      console.error("Error saving albums:", error);
      throw new AItError("SPOTIFY_SAVE_ALBUM_BULK", "Failed to save albums to repository");
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
