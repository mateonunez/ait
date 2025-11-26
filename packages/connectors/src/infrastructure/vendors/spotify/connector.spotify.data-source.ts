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
import { requestJson, AItError, RateLimitError } from "@ait/core";

interface SpotifyPaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

dotenv.config();

export class ConnectorSpotifyDataSource implements IConnectorSpotifyDataSource {
  private readonly apiUrl: string;
  private accessToken: string;

  constructor(accessToken: string) {
    this.apiUrl = process.env.SPOTIFY_API_ENDPOINT || "https://api.spotify.com/v1";
    this.accessToken = accessToken;
  }

  async fetchTracks(cursor?: string): Promise<SpotifyPaginatedResponse<SpotifyTrackExternal>> {
    const limit = 50;
    const offset = cursor ? Number.parseInt(cursor, 10) : 0;
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await this._fetchFromSpotify<{
      items: {
        added_at: string;
        track: SpotifyTrackExternal;
      }[];
      next: string | null;
      total: number;
    }>(`/me/tracks?${params.toString()}`);

    const tracks =
      response?.items?.map((item) => ({
        ...item.track,
        addedAt: item.added_at,
        __type: "track" as const,
      })) ?? [];

    return {
      items: tracks,
      nextCursor: response.next ? (offset + limit).toString() : undefined,
    };
  }

  async fetchTopArtists(): Promise<SpotifyArtistExternal[]> {
    const response = await this._fetchFromSpotify<{
      items: SpotifyArtistExternal[];
    }>("/me/top/artists");

    return response.items;
  }

  async fetchPlaylists(cursor?: string): Promise<SpotifyPaginatedResponse<SpotifyPlaylistExternal>> {
    const limit = 50;
    const offset = cursor ? Number.parseInt(cursor, 10) : 0;
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await this._fetchFromSpotify<{
      items: SpotifyPlaylistExternal[];
      next: string | null;
      total: number;
    }>(`/me/playlists?${params.toString()}`);

    const prioritizedPlaylists = response.items.sort((a, b) => {
      return a.owner?.display_name?.toLowerCase() === "mateonunez" ? -1 : 1;
    });

    return {
      items: prioritizedPlaylists,
      nextCursor: response.next ? (offset + limit).toString() : undefined,
    };
  }

  async fetchPlaylistById(playlistId: string): Promise<SpotifyPlaylistExternal> {
    const response = await this._fetchFromSpotify<SpotifyPlaylistExternal>(`/playlists/${playlistId}`);
    return {
      ...response,
      __type: "playlist" as const,
    };
  }

  async fetchAlbums(cursor?: string): Promise<SpotifyPaginatedResponse<SpotifyAlbumExternal>> {
    const limit = 50;
    const offset = cursor ? Number.parseInt(cursor, 10) : 0;
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await this._fetchFromSpotify<{
      items: {
        added_at: string;
        album: SpotifyAlbumExternal;
      }[];
      next: string | null;
      total: number;
    }>(`/me/albums?${params.toString()}`);

    const albums = response.items.map((album) => ({
      ...album.album,
      addedAt: album.added_at,
      __type: "album" as const,
    }));

    // Sort by popularity to prioritize more significant albums
    const sortedAlbums = albums.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return {
      items: sortedAlbums,
      nextCursor: response.next ? (offset + limit).toString() : undefined,
    };
  }

  async fetchAlbumById(albumId: string): Promise<SpotifyAlbumExternal> {
    const response = await this._fetchFromSpotify<SpotifyAlbumExternal>(`/albums/${albumId}`);
    return {
      ...response,
      __type: "album" as const,
    };
  }

  async fetchRecentlyPlayed(
    cursor?: string,
    limit = 50,
  ): Promise<SpotifyPaginatedResponse<SpotifyRecentlyPlayedExternal>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) {
      params.append("after", cursor);
    }

    const response = await this._fetchFromSpotify<{
      items: SpotifyRecentlyPlayedExternal[];
      cursors?: {
        after: string;
        before: string;
      };
      next?: string;
    }>(`/me/player/recently-played?${params}`);

    // Spotify recently-played API is unique:
    // 'after' returns items *after* the timestamp (older to newer).
    // 'cursors.after' is the timestamp of the *newest* item in the batch.
    // To paginate forward, we use the 'cursors.after' from the response.

    return {
      items: response.items.map((item) => ({
        ...item,
        __type: "recently_played" as const,
      })),
      nextCursor: response.cursors?.after,
    };
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
        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          const headers = (error.meta?.headers as Record<string, string>) || {};
          const retryAfter = headers["retry-after"];
          const resetTime = retryAfter ? Date.now() + Number.parseInt(retryAfter, 10) * 1000 : Date.now() + 60 * 1000;
          throw new RateLimitError("spotify", resetTime, "Spotify rate limit exceeded");
        }
        throw error;
      }
      throw new AItError("NETWORK", `Network error: ${error.message}`, undefined, error);
    }
  }
}
