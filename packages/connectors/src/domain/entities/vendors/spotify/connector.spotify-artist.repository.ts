import { AItError } from "@ait/core";
import { connectorSpotifyArtistMapper } from "../../../../domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type {
  IConnectorSpotifyArtistRepository,
  SpotifyArtistEntity,
} from "../../../../types/domain/entities/vendors/connector.spotify.types";
import { getPostgresClient, spotifyArtists, type SpotifyArtistDataTarget } from "@ait/postgres";
import { randomUUID } from "node:crypto";

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
          updatedAt: artistDataTarget.updatedAt ?? new Date(),
        };

        if (artistDataTarget.createdAt) {
          updateValues.createdAt = artistDataTarget.createdAt;
        }

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
      console.error("Failed to save artist:", { artistId: artist.id, error });
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
      console.debug("Saving artists to Spotify repository:", { artists });

      for (const artist of artists) {
        await this.saveArtist(artist, { incremental: false });
      }
    } catch (error) {
      console.error("Error saving artists:", error);
      throw new AItError("SPOTIFY_SAVE_ARTIST_BULK", "Failed to save artists to repository");
    }
  }

  async getArtist(id: string): Promise<SpotifyArtistEntity | null> {
    console.log("Getting artist from Spotify repository", id);
    return null;
  }

  async getArtists(): Promise<SpotifyArtistEntity[]> {
    console.log("Getting artists from Spotify repository");
    return [];
  }
}
