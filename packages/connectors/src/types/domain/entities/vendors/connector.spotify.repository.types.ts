import type { IConnectorRepository } from "@/types/domain/entities/connector.repository.interface";

/**
 * Options for saving a track
 */

export interface IConnectorSpotifyTrackRepositoryOptions {
  incremental: boolean;
}
/**
 * Repository interface for Spotify tracks
 */

export interface IConnectorSpotifyTrackRepository {
  saveTrack(track: SpotifyTrackEntity, options?: IConnectorSpotifyTrackRepositoryOptions): Promise<void>;
  saveTracks(tracks: SpotifyTrackEntity[]): Promise<void>;

  getTrack(id: string): Promise<SpotifyTrackEntity | null>;
  getTracks(): Promise<SpotifyTrackEntity[]>;
}
/**
 * Repository interface for Spotify tracks
 */

export interface IConnectorSpotifyRepository extends IConnectorRepository {
  track: IConnectorSpotifyTrackRepository;
}
/**
 * Base interface for all Spotify entities
 */

export interface BaseSpotifyEntity {
  type: "track" | "album" | "artist" | "playlist";
}
/**
 * EXTERNAL
 */
/**
 * Represents a Spotify artist
 */

export interface SpotifyArtist {
  id: string;
  name: string;
  href: string;
  type: string;
  uri: string;
}
/**
 * Represents a Spotify album
 */

export interface SpotifyAlbum {
  album_type: string;
  artists: SpotifyArtist[];
  available_markets: string[];
  external_urls: { [key: string]: string };
  href: string;
  id: string;
  images: { url: string; height: number; width: number }[];
  is_playable: boolean;
  name: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: string;
  uri: string;
}
/**
 * Represents a Spotify track
 */

export interface SpotifyTrack extends BaseSpotifyEntity {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  popularity: number;
  createdAt: Date;
  updatedAt: Date;

  [key: string]: any;
}
/**
 * EXTERNAL
 * Represents the raw data from Spotify with the type of the entity
 */

export interface SpotifyTrackExternal extends SpotifyTrack, BaseSpotifyEntity {
  type: "track";
}
/**
 * DOMAIN
 * Represents a simplified domain entity
 */

export interface SpotifyTrackEntity extends BaseSpotifyEntity {
  id: string;
  name: string;
  artist: string;
  album: string;
  durationMs: number;
  popularity: number;
  createdAt: Date;
  updatedAt: Date;
  type: "track";
}
/**
 * Union type for any Spotify domain entity
 */

export type SpotifyEntity = SpotifyTrackEntity; // | SpotifyAlbumEntity | SpotifyArtistEntity | SpotifyPlaylistEntity;

/**
 * Union type for any Spotify external data representation
 */
export type SpotifyData = SpotifyTrackExternal; // | SpotifyAlbum | SpotifyArtist | SpotifyPlaylist;
