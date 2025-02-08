import type {
  SpotifyArtistExternal,
  SpotifyTrackExternal,
} from "../domain/entities/vendors/connector.spotify.repository.types";

export interface IConnectorSpotifyDataSource {
  fetchTopTracks(): Promise<SpotifyTrackExternal[]>;
  fetchTopArtists(): Promise<SpotifyArtistExternal[]>;
}
