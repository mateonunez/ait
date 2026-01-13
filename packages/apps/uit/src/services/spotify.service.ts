import { requestJson } from "@ait/core";
import type {
  PaginatedResponse,
  PaginationParams,
  RefreshResponse,
  SpotifyAlbumEntity as SpotifyAlbum,
  SpotifyArtistEntity as SpotifyArtist,
  SpotifyPlaylistEntity as SpotifyPlaylist,
  SpotifyRecentlyPlayedEntity as SpotifyRecentlyPlayed,
  SpotifyTrackEntity as SpotifyTrack,
} from "@ait/core";
import { apiConfig, buildQueryString } from "../config/api.config";

export class SpotifyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${apiConfig.gatewayUrl}/api/spotify`;
  }

  async fetchTracks(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/tracks${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<SpotifyTrack>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async fetchArtists(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/artists${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<SpotifyArtist>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async fetchPlaylists(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/playlists${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<SpotifyPlaylist>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async fetchAlbums(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/albums${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<SpotifyAlbum>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async fetchRecentlyPlayed(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/recently-played${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<SpotifyRecentlyPlayed>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async refresh(entities?: string[]) {
    const queryParams = entities ? `?entities=${entities.join(",")}` : "";
    const result = await requestJson<RefreshResponse>(`${this.baseUrl}/refresh${queryParams}`, { method: "POST" });
    if (!result.ok) throw result.error;
    return result.value.data;
  }
}

export const spotifyService = new SpotifyService();
