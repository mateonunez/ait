import type {
  SpotifyArtistExternal,
  SpotifyTrackExternal,
  SpotifyPlaylistExternal,
  SpotifyAlbumExternal,
  SpotifyRecentlyPlayedExternal,
  SpotifyCurrentlyPlayingExternal,
} from "@ait/core";

interface SpotifyPaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

export interface IConnectorSpotifyDataSource {
  fetchTracks(cursor?: string): Promise<SpotifyPaginatedResponse<SpotifyTrackExternal>>;
  fetchTopArtists(): Promise<SpotifyArtistExternal[]>;
  fetchPlaylists(cursor?: string): Promise<SpotifyPaginatedResponse<SpotifyPlaylistExternal>>;
  fetchPlaylistById(playlistId: string): Promise<SpotifyPlaylistExternal>;
  fetchAlbums(cursor?: string): Promise<SpotifyPaginatedResponse<SpotifyAlbumExternal>>;
  fetchAlbumById(albumId: string): Promise<SpotifyAlbumExternal>;
  fetchRecentlyPlayed(
    cursor?: string,
    limit?: number,
  ): Promise<SpotifyPaginatedResponse<SpotifyRecentlyPlayedExternal>>;
  fetchCurrentlyPlaying(): Promise<SpotifyCurrentlyPlayingExternal | null>;
}
