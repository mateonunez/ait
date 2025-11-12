import type {
  SpotifyAlbumExternal,
  SpotifyArtistExternal,
  SpotifyCurrentlyPlayingExternal,
  SpotifyPlaylistExternal,
  SpotifyRecentlyPlayedExternal,
  SpotifyTrackExternal,
} from "@ait/core";
import type { IConnectorSpotifyDataSource } from "../../../types/infrastructure/connector.spotify.data-source.interface";
import dotenv from "dotenv";
import { requestJson } from "@ait/core";
import { AItError } from "@ait/core";

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

    const tracks =
      response?.items?.map((item) => ({
        ...item.track,
        addedAt: item.added_at,
        __type: "track" as const,
      })) ?? [];

    return tracks;
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

    const prioritizedPlaylists = response.items.sort((a, b) => {
      return a.owner?.display_name?.toLowerCase() === "mateonunez" ? -1 : 1;
    });

    return prioritizedPlaylists;
  }

  async fetchPlaylistById(playlistId: string): Promise<SpotifyPlaylistExternal> {
    const response = await this._fetchFromSpotify<SpotifyPlaylistExternal>(`/playlists/${playlistId}`);
    return {
      ...response,
      __type: "playlist" as const,
    };
  }

  async fetchAlbums(): Promise<SpotifyAlbumExternal[]> {
    const response = await this._fetchFromSpotify<{
      items: {
        added_at: string;
        album: SpotifyAlbumExternal;
      }[];
    }>("/me/albums");

    const albums = response.items.map((album) => ({
      ...album.album,
      addedAt: album.added_at,
      __type: "album" as const,
    }));

    // Sort by popularity to prioritize more significant albums
    const sortedAlbums = albums.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return sortedAlbums;
  }

  async fetchAlbumById(albumId: string): Promise<SpotifyAlbumExternal> {
    const response = await this._fetchFromSpotify<SpotifyAlbumExternal>(`/albums/${albumId}`);
    return {
      ...response,
      __type: "album" as const,
    };
  }

  async fetchRecentlyPlayed(limit = 20): Promise<SpotifyRecentlyPlayedExternal[]> {
    const params = new URLSearchParams({ limit: limit.toString() });

    const response = await this._fetchFromSpotify<{
      items: SpotifyRecentlyPlayedExternal[];
    }>(`/me/player/recently-played?${params}`);

    return response.items.map((item) => ({
      ...item,
      __type: "recently_played" as const,
    }));
  }

  async fetchCurrentlyPlaying(): Promise<SpotifyCurrentlyPlayingExternal | null> {
    const response = await this._fetchFromSpotify<{
      is_playing: boolean;
      item: SpotifyTrackExternal | null;
      progress_ms: number;
      timestamp: number;
      context: {
        type: string;
        uri: string;
      } | null;
    }>("/me/player/currently-playing");

    if (!response || !response.item) {
      return null;
    }

    return {
      is_playing: response.is_playing,
      item: {
        ...response.item,
        __type: "track" as const,
      },
      progress_ms: response.progress_ms,
      timestamp: response.timestamp,
      context: response.context,
    };
  }

  private async _fetchFromSpotify<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    try {
      const result = await requestJson<T>(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!result.ok) {
        throw result.error;
      }

      return result.value.data as unknown as T;
    } catch (error: any) {
      if (error instanceof AItError) {
        throw error;
      }
      throw new AItError("NETWORK", `Network error: ${error.message}`, undefined, error);
    }
  }
}
