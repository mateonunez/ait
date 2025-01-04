import type { SpotifyTrackEntity } from "../../domain/entities/spotify/connector.spotify.entities";

export interface IConnectorSpotifyService {
  getTracks(): Promise<SpotifyTrackEntity[]>;
}
