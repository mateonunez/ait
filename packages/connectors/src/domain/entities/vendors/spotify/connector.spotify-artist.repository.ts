import { AItError, type PaginatedResponse, type PaginationParams, type SpotifyArtistEntity } from "@ait/core";
import { connectorSpotifyArtistMapper } from "../../../../domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSpotifyArtistRepository } from "../../../../types/domain/entities/vendors/connector.spotify.types";
import { getPostgresClient, spotifyArtists, type SpotifyArtistDataTarget, drizzleOrm } from "@ait/postgres";
import { randomUUID } from "node:crypto";
import { getLogger } from "@ait/core";

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
      const artistDataTarget = connectorSpotifyArtistMapper.domainToDataTarget(artist);
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
          .values(artistDataTarget)
          .onConflictDoUpdate({
            target: spotifyArtists.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      logger.error("Failed to save artist:", { artistId: artist.id, error });
      throw new AItError(
        "SPOTIFY_SAVE_ARTIST",
        `Failed to save artist ${artist.id}: ${error.message}`,
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
      logger.debug("Saving artists to Spotify repository:", { artists });

      for (const artist of artists) {
        await this.saveArtist(artist, { incremental: false });
      }
    } catch (error) {
      logger.error("Error saving artists:", { error });
      throw new AItError("SPOTIFY_SAVE_ARTIST_BULK", "Failed to save artists to repository");
    }
  }

  async getArtist(id: string): Promise<SpotifyArtistEntity | null> {
    logger.info("Getting artist from Spotify repository", { id });
    return null;
  }

  async fetchArtists(): Promise<SpotifyArtistEntity[]> {
    logger.info("Getting artists from Spotify repository");
    return [];
  }

  async getArtistsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyArtistEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [artists, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(spotifyArtists)
        .orderBy(drizzleOrm.desc(spotifyArtists.createdAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(spotifyArtists),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: artists.map((artist) => connectorSpotifyArtistMapper.dataTargetToDomain(artist)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
