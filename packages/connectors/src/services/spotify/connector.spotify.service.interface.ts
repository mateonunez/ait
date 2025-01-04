import type { NormalizedSpotifyTrack } from "../../infrastructure/spotify/normalizer/connector.spotify.normalizer.interface";

export interface IConnectorSpotifyService {
  getTracks(): Promise<NormalizedSpotifyTrack[]>;
}
