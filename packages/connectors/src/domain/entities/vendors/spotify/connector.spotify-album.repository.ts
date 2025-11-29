import { AItError, type PaginatedResponse, type PaginationParams, type SpotifyAlbumEntity } from "@ait/core";
import { connectorSpotifyAlbumMapper } from "../../../../domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSpotifyAlbumRepository } from "../../../../types/domain/entities/vendors/connector.spotify.types";
import { getPostgresClient, spotifyAlbums, type SpotifyAlbumDataTarget, drizzleOrm } from "@ait/postgres";
import { randomUUID } from "node:crypto";
import { getLogger } from "@ait/core";

const logger = getLogger();

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
      logger.error("Failed to save album:", { albumId: album.id, error });
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
      logger.error("Error saving albums:", { error });
      throw new AItError("SPOTIFY_SAVE_ALBUM_BULK", "Failed to save albums to repository");
    }
  }

  async getAlbum(id: string): Promise<SpotifyAlbumEntity | null> {
    logger.info("Getting album from Spotify repository", { id });
    return null;
  }

  async fetchAlbums(): Promise<SpotifyAlbumEntity[]> {
    logger.info("Getting albums from Spotify repository");
    return [];
  }

  async getAlbumsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyAlbumEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [albums, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(spotifyAlbums)
        .orderBy(drizzleOrm.desc(spotifyAlbums.createdAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(spotifyAlbums),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: albums.map((album) => connectorSpotifyAlbumMapper.dataTargetToDomain(album)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
