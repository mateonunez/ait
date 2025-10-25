import type {
  SpotifyArtistExternal,
  SpotifyTrackExternal,
  SpotifyPlaylistExternal,
  SpotifyAlbumExternal,
  SpotifyRecentlyPlayedExternal,
  SpotifyCurrentlyPlayingExternal,
} from "../domain/entities/vendors/connector.spotify.types";

export interface IConnectorSpotifyDataSource {
  fetchTracks(): Promise<SpotifyTrackExternal[]>;
  fetchTopArtists(): Promise<SpotifyArtistExternal[]>;
  fetchPlaylists(): Promise<SpotifyPlaylistExternal[]>;
  fetchPlaylistById(playlistId: string): Promise<SpotifyPlaylistExternal>;
  fetchAlbums(): Promise<SpotifyAlbumExternal[]>;
  fetchAlbumById(albumId: string): Promise<SpotifyAlbumExternal>;
  fetchRecentlyPlayed(limit?: number): Promise<SpotifyRecentlyPlayedExternal[]>;
  fetchCurrentlyPlaying(): Promise<SpotifyCurrentlyPlayingExternal | null>;
}
