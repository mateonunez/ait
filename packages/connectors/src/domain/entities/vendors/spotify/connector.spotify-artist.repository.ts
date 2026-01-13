import { randomUUID } from "node:crypto";
import {
  AItError,
  type PaginatedResponse,
  type PaginationParams,
  SpotifyArtistEntity,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
} from "@ait/core";
import { type SpotifyArtistDataTarget, drizzleOrm, getPostgresClient, spotifyArtists } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSpotifyArtistRepository } from "../../../../types/domain/entities/vendors/connector.spotify.types";

const logger = getLogger();

export class ConnectorSpotifyArtistRepository implements IConnectorSpotifyArtistRepository {
  private _pgClient = getPostgresClient();

  async saveArtist(
    artist: SpotifyArtistEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const artistId = incremental ? randomUUID() : artist.id;

    try {
      const artistDataTarget = artist.toPlain<SpotifyArtistDataTarget>();
      artistDataTarget.id = artistId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<SpotifyArtistDataTarget> = {
          name: artistDataTarget.name,
          popularity: artistDataTarget.popularity,
          genres: artistDataTarget.genres,
          updatedAt: new Date(),
        };

        await tx
          .insert(spotifyArtists)
          .values(artistDataTarget as any)
          .onConflictDoUpdate({
            target: spotifyArtists.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to save artist:", { artistId: artist.id, error: message });
      throw new AItError(
        "SPOTIFY_SAVE_ARTIST",
        `Failed to save artist ${artist.id}: ${message}`,
        { id: artist.id },
        error,
      );
    }
  }

  async saveArtists(artists: SpotifyArtistEntity[]): Promise<void> {
    if (!artists.length) {
      return;
    }

    try {
      for (const artist of artists) {
        await this.saveArtist(artist, { incremental: false });
      }
    } catch (error) {
      logger.error("Error saving artists:", { error });
      throw new AItError("SPOTIFY_SAVE_ARTIST_BULK", "Failed to save artists to repository");
    }
  }

  async getArtist(id: string): Promise<SpotifyArtistEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(spotifyArtists)
      .where(drizzleOrm.eq(spotifyArtists.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return SpotifyArtistEntity.fromPlain(result[0]! as SpotifyArtistDataTarget);
  }

  async fetchArtists(): Promise<SpotifyArtistEntity[]> {
    const artists = await this._pgClient.db.select().from(spotifyArtists);
    return artists.map((artist) => SpotifyArtistEntity.fromPlain(artist as SpotifyArtistDataTarget));
  }

  async getArtistsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyArtistEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [artists, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(spotifyArtists)
        .orderBy(drizzleOrm.desc(spotifyArtists.createdAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(spotifyArtists),
    ]);

    return buildPaginatedResponse(
      artists.map((artist) => SpotifyArtistEntity.fromPlain(artist as SpotifyArtistDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}
