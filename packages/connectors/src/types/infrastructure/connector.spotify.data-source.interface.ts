import type {
  SpotifyArtistExternal,
  SpotifyTrackExternal,
  SpotifyPlaylistExternal,
} from "../domain/entities/vendors/connector.spotify.types";

export interface IConnectorSpotifyDataSource {
  fetchTracks(): Promise<SpotifyTrackExternal[]>;
  fetchTopArtists(): Promise<SpotifyArtistExternal[]>;
  fetchPlaylists(): Promise<SpotifyPlaylistExternal[]>;
  fetchPlaylistById(playlistId: string): Promise<SpotifyPlaylistExternal>;
}
