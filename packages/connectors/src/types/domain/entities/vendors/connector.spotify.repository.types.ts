import type {
  IConnectorRepository,
  IConnectorRepositorySaveOptions,
} from "@/types/domain/entities/connector.repository.interface";
import type { components as SpotifyComponents } from "@/types/openapi/spotify.types";

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
  __type: "track" | "album" | "artist" | "playlist";
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
type SpotifyArtist = SpotifyComponents["schemas"]["ArtistObject"];

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
  __type: string;
  uri: string;
}

/**
 * Represents a Spotify track
 */
type SpotifyTrack = SpotifyComponents["schemas"]["TrackObject"];

/**
 * EXTERNAL
 * Represents the raw data from Spotify with the type of the entity
 */
export interface SpotifyTrackExternal extends Omit<SpotifyTrack, "type">, BaseSpotifyEntity {
  __type: "track";
}

export interface SpotifyArtistExternal extends Omit<SpotifyArtist, "type">, BaseSpotifyEntity {
  __type: "artist";
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
  __type: "track";
}

export interface SpotifyArtistEntity extends BaseSpotifyEntity {
  id: string;
  name: string;
  popularity: number;
  genres: string[];
  createdAt: Date;
  updatedAt: Date;
  __type: "artist";
}

/**
 * Union type for any Spotify domain entity
 */

export type SpotifyEntity = SpotifyTrackEntity | SpotifyArtistEntity; // | SpotifyAlbumEntity | SpotifyPlaylistEntity;

/**
 * Union type for any Spotify external data representation
 */
export type SpotifyExternal = SpotifyTrackExternal | SpotifyArtistExternal; // | SpotifyAlbum | SpotifyPlaylist;
