import { fetch } from "undici";
import dotenv from "dotenv";
import type { SpotifyTrack } from "@/domain/entities/vendors/connector.spotify.repository";

dotenv.config();

export class ConnectorSpotifyDataSource implements IConnectorSpotifyDataSource {
  private readonly apiUrl: string;
  private accessToken: string;

  constructor(accessToken: string) {
    this.apiUrl = process.env.SPOTIFY_API_ENDPOINT || "https://api.spotify.com/v1";
    this.accessToken = accessToken;
  }

  async fetchTopTracks(): Promise<SpotifyTrack[]> {
    const response = await this._fetchFromSpotify<{ items: SpotifyTrack[] }>("/me/top/tracks");

    return response.items.map((track) => ({
      ...track,
      type: "track",
    }));
  }

  private async _fetchFromSpotify<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    try {
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
export interface IConnectorSpotifyDataSource {
  fetchTopTracks(): Promise<SpotifyTrack[]>;
}
