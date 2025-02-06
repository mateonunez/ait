import type { SpotifyArtist, SpotifyTrack } from "@/types/domain/entities/vendors/connector.spotify.repository.types";

export interface IConnectorSpotifyDataSource {
  fetchTopTracks(): Promise<SpotifyTrack[]>;
  fetchTopArtists(): Promise<SpotifyArtist[]>;
}
