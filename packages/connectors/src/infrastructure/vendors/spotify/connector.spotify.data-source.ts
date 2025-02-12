import { fetch } from "undici";
import dotenv from "dotenv";
import type { IConnectorSpotifyDataSource } from "@/types/infrastructure/connector.spotify.data-source.interface";
import type {
  SpotifyArtistExternal,
  SpotifyTrackExternal,
  SpotifyPlaylistExternal,
} from "@/types/domain/entities/vendors/connector.spotify.types";

dotenv.config();

export class ConnectorSpotifyDataSource implements IConnectorSpotifyDataSource {
  private readonly apiUrl: string;
  private accessToken: string;

  constructor(accessToken: string) {
    this.apiUrl = process.env.SPOTIFY_API_ENDPOINT || "https://api.spotify.com/v1";
    this.accessToken = accessToken;
  }

  async fetchTracks(): Promise<SpotifyTrackExternal[]> {
    const response = await this._fetchFromSpotify<{
      items: {
        added_at: string;
        track: SpotifyTrackExternal;
      }[];
    }>("/me/tracks");

    return (
      response?.items?.map((item) => ({
        ...item.track,
        addedAt: item.added_at,
        __type: "track" as const,
      })) ?? []
    );
  }

  async fetchTopArtists(): Promise<SpotifyArtistExternal[]> {
    const response = await this._fetchFromSpotify<{
      items: SpotifyArtistExternal[];
    }>("/me/top/artists");

    return response.items;
  }

  async fetchPlaylists(): Promise<SpotifyPlaylistExternal[]> {
    const response = await this._fetchFromSpotify<{
      items: SpotifyPlaylistExternal[];
    }>("/me/playlists");

    return response.items.map((playlist) => ({
      ...playlist,
      __type: "playlist" as const,
    }));
  }

  async fetchPlaylistById(playlistId: string): Promise<SpotifyPlaylistExternal> {
    const response = await this._fetchFromSpotify<SpotifyPlaylistExternal>(`/playlists/${playlistId}`);
    return {
      ...response,
      __type: "playlist" as const,
    };
  }

  private async _fetchFromSpotify<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    try {
      console.log("Fetching from Spotify:", url);
      console.log("Access token:", this.accessToken);
      console.log("Method:", method);
      console.log("Body:", body);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ConnectorSpotifyDataSourceError(
          `Spotify API error: ${response.status} ${response.statusText}`,
          errorBody,
        );
      }

      return (await response.json()) as T;
    } catch (error: any) {
      if (error instanceof ConnectorSpotifyDataSourceError) {
        throw error;
      }
      throw new ConnectorSpotifyDataSourceError(`Network error: ${error.message}`, "");
    }
  }
}

export class ConnectorSpotifyDataSourceError extends Error {
  public responseBody: string;

  constructor(message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorSpotifyDataSourceError";
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorSpotifyDataSourceError.prototype);
  }
}
