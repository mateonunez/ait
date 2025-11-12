import type { components as SpotifyComponents } from "../openapi/openapi.spotify.types";

export interface BaseSpotifyEntity {
  __type: "track" | "album" | "artist" | "playlist" | "recently_played";
}

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyFollowers {
  href: string | null;
  total: number;
}

export interface SpotifyTrackEntity extends BaseSpotifyEntity {
  id: string;
  name: string;
  artist: string;
  album: string | null;
  durationMs: number;
  explicit: boolean;
  isPlayable: boolean | null;
  previewUrl: string | null;
  trackNumber: number | null;
  discNumber: number | null;
  uri: string | null;
  href: string | null;
  isLocal: boolean;
  popularity: number | null;
  albumData: Record<string, unknown> | null;
  artistsData: Array<Record<string, unknown>>;
  externalIds: Record<string, unknown> | null;
  externalUrls: Record<string, unknown> | null;
  addedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  __type: "track";
}

export interface SpotifyArtistEntity extends BaseSpotifyEntity {
  id: string;
  name: string;
  popularity: number;
  genres: string[];
  images: SpotifyImage[] | null;
  createdAt: Date;
  updatedAt: Date;
  __type: "artist";
}

export interface SpotifyPlaylistEntity extends BaseSpotifyEntity {
  id: string;
  name: string;
  description: string | null;
  public: boolean;
  collaborative: boolean;
  owner: string;
  tracks: string[];
  followers: number;
  snapshotId: string;
  externalUrls: string[];
  uri: string;
  href: string;
  images: SpotifyImage[] | null;
  createdAt: Date;
  updatedAt: Date;
  __type: "playlist";
}

export interface SpotifyAlbumEntity extends BaseSpotifyEntity {
  id: string;
  name: string;
  albumType: string;
  artists: string[];
  tracks: string[];
  totalTracks: number;
  releaseDate: string | null;
  releaseDatePrecision: string | null;
  isPlayable: boolean;
  uri: string | null;
  href: string | null;
  popularity: number | null;
  label: string | null;
  copyrights: string[];
  externalIds: string[];
  genres: string[];
  images: SpotifyImage[] | null;
  createdAt: Date;
  updatedAt: Date;
  __type: "album";
}

export interface SpotifyRecentlyPlayedEntity extends BaseSpotifyEntity {
  id: string;
  trackId: string;
  trackName: string;
  artist: string;
  album: string | null;
  durationMs: number;
  explicit: boolean;
  popularity: number | null;
  playedAt: Date;
  context: {
    type: string;
    uri: string;
  } | null;
  albumData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  __type: "recently_played";
}

type SpotifyArtist = SpotifyComponents["schemas"]["ArtistObject"];
type SpotifyTrack = SpotifyComponents["schemas"]["TrackObject"];
type SpotifyPlaylist = SpotifyComponents["schemas"]["PlaylistObject"];
type SpotifyAlbum = SpotifyComponents["schemas"]["AlbumObject"];
type SpotifyRecentlyPlayed = SpotifyComponents["schemas"]["PlayHistoryObject"];

export interface SpotifyTrackExternal extends Omit<SpotifyTrack, "__type">, BaseSpotifyEntity {
  __type: "track";
}

export interface SpotifyArtistExternal extends Omit<SpotifyArtist, "__type">, BaseSpotifyEntity {
  __type: "artist";
}

export interface SpotifyAlbumExternal extends Omit<SpotifyAlbum, "__type">, BaseSpotifyEntity {
  __type: "album";
}

export interface SpotifyPlaylistExternal extends Omit<SpotifyPlaylist, "__type">, BaseSpotifyEntity {
  __type: "playlist";
}

export interface SpotifyRecentlyPlayedExternal extends Omit<SpotifyRecentlyPlayed, "__type">, BaseSpotifyEntity {
  __type: "recently_played";
}

export interface SpotifyCurrentlyPlayingExternal {
  is_playing: boolean;
  item: SpotifyTrackExternal;
  progress_ms: number;
  timestamp: number;
  context: {
    type: string;
    uri: string;
  } | null;
}

export type SpotifyEntity =
  | SpotifyTrackEntity
  | SpotifyArtistEntity
  | SpotifyPlaylistEntity
  | SpotifyAlbumEntity
  | SpotifyRecentlyPlayedEntity;
export type SpotifyExternal =
  | SpotifyTrackExternal
  | SpotifyArtistExternal
  | SpotifyPlaylistExternal
  | SpotifyAlbumExternal
  | SpotifyRecentlyPlayedExternal;
