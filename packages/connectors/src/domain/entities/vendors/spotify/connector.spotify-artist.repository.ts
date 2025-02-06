import { connectorSpotifyArtistMapper } from "@/domain/mappers/vendors/connector.spotify.mapper";
import type { IConnectorRepositorySaveOptions } from "@/types/domain/entities/connector.repository.interface";
import type {
  IConnectorSpotifyArtistRepository,
  SpotifyArtistEntity,
} from "@/types/domain/entities/vendors/connector.spotify.repository.types";
import { getPostgresClient, spotifyArtists } from "@ait/postgres";
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
        await tx.insert(spotifyArtists).values(artistDataTarget).onConflictDoNothing().execute();
      });

      console.debug("Artist saved successfully:", { artistId: artist.id });
    } catch (error: any) {
      console.error("Failed to save artist:", { artistId: artist.id, error });
      throw new Error(`Failed to save artist ${artist.id}: ${error.message}`);
    }
  }

  async saveArtists(artists: SpotifyArtistEntity[]): Promise<void> {
    if (!artists.length) {
      return;
    }

    try {
      console.debug("Saving artists to Spotify repository:", { artists });

      for (const artist of artists) {
        await this.saveArtist(artist, { incremental: true });
      }
    } catch (error) {
      console.error("Error saving artists:", error);
      throw new Error("Failed to save artists to repository");
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
