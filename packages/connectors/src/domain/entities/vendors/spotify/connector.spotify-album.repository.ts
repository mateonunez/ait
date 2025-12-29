import { randomUUID } from "node:crypto";
import { AItError, type PaginatedResponse, type PaginationParams, SpotifyAlbumEntity, getLogger } from "@ait/core";
import { type SpotifyAlbumDataTarget, drizzleOrm, getPostgresClient, spotifyAlbums } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSpotifyAlbumRepository } from "../../../../types/domain/entities/vendors/connector.spotify.types";

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
      const albumDataTarget = album.toPlain<SpotifyAlbumDataTarget>();
      albumDataTarget.id = albumId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<SpotifyAlbumDataTarget> = {
          name: albumDataTarget.name,
          albumType: albumDataTarget.albumType,
          artists: albumDataTarget.artists as any,
          tracks: albumDataTarget.tracks as any,
          totalTracks: albumDataTarget.totalTracks,
          releaseDate: albumDataTarget.releaseDate,
          releaseDatePrecision: albumDataTarget.releaseDatePrecision,
          isPlayable: albumDataTarget.isPlayable,
          uri: albumDataTarget.uri,
          href: albumDataTarget.href,
          popularity: albumDataTarget.popularity,
          label: albumDataTarget.label,
          copyrights: albumDataTarget.copyrights as any,
          externalIds: albumDataTarget.externalIds as any,
          genres: albumDataTarget.genres as any,
          updatedAt: new Date(),
        };

        await tx
          .insert(spotifyAlbums)
          .values(albumDataTarget as any)
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
    const result = await this._pgClient.db
      .select()
      .from(spotifyAlbums)
      .where(drizzleOrm.eq(spotifyAlbums.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return SpotifyAlbumEntity.fromPlain(result[0]! as SpotifyAlbumDataTarget);
  }

  async fetchAlbums(): Promise<SpotifyAlbumEntity[]> {
    const albums = await this._pgClient.db.select().from(spotifyAlbums);
    return albums.map((album) => SpotifyAlbumEntity.fromPlain(album as SpotifyAlbumDataTarget));
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
      data: albums.map((album) => SpotifyAlbumEntity.fromPlain(album as SpotifyAlbumDataTarget)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
