import type { SpotifyTrack } from "../normalizer/connector.spotify.normalizer.interface";

export interface IConnectorSpotifyDataSource {
  fetchTopTracks(): Promise<SpotifyTrack[]>;
}
