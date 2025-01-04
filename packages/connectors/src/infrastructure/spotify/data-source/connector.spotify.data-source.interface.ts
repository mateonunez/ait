import type { SpotifyTrack } from "../../../domain/entities/spotify/connector.spotify.entities";

export interface IConnectorSpotifyDataSource {
  fetchTopTracks(): Promise<SpotifyTrack[]>;
}
