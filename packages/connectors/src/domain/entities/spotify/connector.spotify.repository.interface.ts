import type { SpotifyTrackEntity } from "./connector.spotify.entities";

export interface IConnectorSpotifyTrackRepository {
  saveTrack(track: SpotifyTrackEntity): Promise<void>;
  saveTracks(tracks: SpotifyTrackEntity[]): Promise<void>;

  getTrack(id: string): Promise<SpotifyTrackEntity | null>;
  getTracks(): Promise<SpotifyTrackEntity[]>;
}

export interface IConnectorSpotifyRepository extends IConnectorSpotifyTrackRepository {}
