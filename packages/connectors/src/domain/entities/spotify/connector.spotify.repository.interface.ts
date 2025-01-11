import type { IConnectorRepository } from "../connector.repository.interface";
import type { SpotifyTrackEntity } from "./connector.spotify.entities";

export interface IConnectorSpotifyTrackRepositoryOptions {
  incremental: boolean;
}

export interface IConnectorSpotifyTrackRepository {
  saveTrack(track: SpotifyTrackEntity, options?: IConnectorSpotifyTrackRepositoryOptions): Promise<void>;
  saveTracks(tracks: SpotifyTrackEntity[]): Promise<void>;

  getTrack(id: string): Promise<SpotifyTrackEntity | null>;
  getTracks(): Promise<SpotifyTrackEntity[]>;
}

export interface IConnectorSpotifyRepository extends IConnectorRepository {
  track: IConnectorSpotifyTrackRepository;
}
