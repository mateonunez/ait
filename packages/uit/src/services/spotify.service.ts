import { requestJson } from "@ait/core";
import type {
  PaginationParams,
  PaginatedResponse,
  RefreshResponse,
  SpotifyTrackEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyAlbumEntity,
  SpotifyRecentlyPlayedEntity,
} from "@ait/core";

type SpotifyTrack = SpotifyTrackEntity;
type SpotifyArtist = SpotifyArtistEntity;
type SpotifyPlaylist = SpotifyPlaylistEntity;
type SpotifyAlbum = SpotifyAlbumEntity;
type SpotifyRecentlyPlayed = SpotifyRecentlyPlayedEntity;

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class SpotifyService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = `${baseUrl}/api/spotify`;
  }

  async getTracks(params?: PaginationParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/tracks${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<SpotifyTrack>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async getArtists(params?: PaginationParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/artists${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<SpotifyArtist>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async getPlaylists(params?: PaginationParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/playlists${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<SpotifyPlaylist>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async getAlbums(params?: PaginationParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/albums${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<SpotifyAlbum>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async getRecentlyPlayed(params?: PaginationParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/recently-played${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<SpotifyRecentlyPlayed>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async refresh() {
    const result = await requestJson<RefreshResponse>(`${this.baseUrl}/refresh`, {
      method: "POST",
    });

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }
}

export const spotifyService = new SpotifyService();
