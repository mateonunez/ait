import type {
  SpotifyAlbumExternal,
  SpotifyArtistExternal,
  SpotifyCurrentlyPlayingExternal,
  SpotifyPlaylistExternal,
  SpotifyPlaylistTrackExternal,
  SpotifyRecentlyPlayedExternal,
  SpotifyTrackExternal,
} from "@ait/core";
import { getLogger } from "@ait/core";
import { RateLimitedHttpClient } from "../../../shared/utils/rate-limited-http-client";
import type { IConnectorSpotifyDataSource } from "../../../types/infrastructure/connector.spotify.data-source.interface";

interface SpotifyPaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

export class ConnectorSpotifyDataSource implements IConnectorSpotifyDataSource {
  private readonly _httpClient: RateLimitedHttpClient;
  private _logger = getLogger();

  constructor(accessToken: string) {
    const apiUrl = process.env.SPOTIFY_API_ENDPOINT || "https://api.spotify.com/v1";
    this._httpClient = new RateLimitedHttpClient(accessToken, {
      vendor: "spotify",
      baseUrl: apiUrl,
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      chunkDelayMs: 200,
    });
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

    const tracks: SpotifyTrackExternal[] =
      response?.items?.map((item) => ({
        ...item.track,
        addedAt: item.added_at,
        __type: "spotify_track" as const,
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

    return response.items.map((artist) => ({
      ...artist,
      __type: "spotify_artist" as const,
    }));
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

    return {
      items: response.items,
      nextCursor: response.next ? (offset + limit).toString() : undefined,
    };
  }

  async fetchPlaylistById(playlistId: string): Promise<SpotifyPlaylistExternal> {
    const response = await this._fetchFromSpotify<SpotifyPlaylistExternal>(`/playlists/${playlistId}`);
    return {
      ...response,
      __type: "spotify_playlist" as const,
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

    const albums = response.items.map((item) => ({
      ...item.album,
      addedAt: item.added_at,
      __type: "spotify_album" as const,
    }));

    // Sort by popularity (most popular first)
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
      __type: "spotify_album" as const,
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

    return {
      items: response.items.map((item) => ({
        ...item,
        __type: "spotify_recently_played" as const,
      })),
      nextCursor: response.cursors?.after,
    };
  }

  async fetchPlaylistTracks(
    playlistId: string,
    cursor?: string,
  ): Promise<SpotifyPaginatedResponse<SpotifyPlaylistTrackExternal>> {
    const limit = 50;
    const offset = cursor ? Number.parseInt(cursor, 10) : 0;
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await this._fetchFromSpotify<{
      items: SpotifyPlaylistTrackExternal[];
      next: string | null;
      total: number;
    }>(`/playlists/${playlistId}/tracks?${params.toString()}`);

    return {
      items: response.items ?? [],
      nextCursor: response.next ? (offset + limit).toString() : undefined,
    };
  }

  async fetchAllPlaylistTracks(playlistId: string): Promise<SpotifyPlaylistTrackExternal[]> {
    const allTracks: SpotifyPlaylistTrackExternal[] = [];
    let nextCursor: string | undefined = undefined;

    do {
      const response = await this.fetchPlaylistTracks(playlistId, nextCursor);
      allTracks.push(...response.items);
      nextCursor = response.nextCursor;

      // Small delay to be nice to the API if we are paginating heavily
      if (nextCursor) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } while (nextCursor);

    return allTracks;
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
        __type: "spotify_track" as const,
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
    return this._httpClient.request<T>(endpoint, { method, body });
  }
}
