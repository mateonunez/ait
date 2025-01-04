/**
 * Base interface for all Spotify entities
 */
export interface BaseSpotifyEntity {
  type: "track" | "album" | "artist" | "playlist";
}

/**
 * EXTERNAL
 */
export interface SpotifyArtist {
  id: string;
  name: string;
  href: string;
  type: string;
  uri: string;
}

interface SpotifyAlbum {
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
