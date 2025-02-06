import type {
  IConnectorRepository,
  IConnectorRepositorySaveOptions,
} from "@/types/domain/entities/connector.repository.interface";

/**
 * Repository interface for Spotify tracks
 */

export interface IConnectorSpotifyTrackRepository {
  saveTrack(track: SpotifyTrackEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveTracks(tracks: SpotifyTrackEntity[]): Promise<void>;

  getTrack(id: string): Promise<SpotifyTrackEntity | null>;
  getTracks(): Promise<SpotifyTrackEntity[]>;
}

export interface IConnectorSpotifyArtistRepository {
  saveArtist(artist: SpotifyArtistEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveArtists(artists: SpotifyArtistEntity[]): Promise<void>;

  getArtist(id: string): Promise<SpotifyArtistEntity | null>;
  getArtists(): Promise<SpotifyArtistEntity[]>;
}

/**
 * Repository interface for Spotify tracks
 */

export interface IConnectorSpotifyRepository extends IConnectorRepository {
  track: IConnectorSpotifyTrackRepository;
  artist: IConnectorSpotifyArtistRepository;
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

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyFollowers {
  href: string | null;
  total: number;
}

/**
 * Represents a Spotify artist
 */
export interface SpotifyArtist extends BaseSpotifyEntity {
  id: string;
  name: string;
  popularity: number;
  uri: string;
  external_urls: { [key: string]: string };
  followers: SpotifyFollowers;
  genres: string[];
  href: string;
  images: SpotifyImage[];

  [key: string]: any;
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

export interface SpotifyArtistExternal extends SpotifyArtist, BaseSpotifyEntity {
  type: "artist";
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

export interface SpotifyArtistEntity extends BaseSpotifyEntity {
  id: string;
  name: string;
  popularity: number;
  genres: string[];
  createdAt: Date;
  updatedAt: Date;
  type: "artist";
}

/**
 * Union type for any Spotify domain entity
 */

export type SpotifyEntity = SpotifyTrackEntity | SpotifyArtistEntity; // | SpotifyAlbumEntity | SpotifyPlaylistEntity;

/**
 * Union type for any Spotify external data representation
 */
export type SpotifyData = SpotifyTrackExternal | SpotifyArtistExternal; // | SpotifyAlbum | SpotifyPlaylist;
