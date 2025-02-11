import type { SpotifyArtistExternal, SpotifyTrackExternal } from "../domain/entities/vendors/connector.spotify.types";

export interface IConnectorSpotifyDataSource {
  fetchTracks(): Promise<SpotifyTrackExternal[]>;
  fetchTopArtists(): Promise<SpotifyArtistExternal[]>;
}
