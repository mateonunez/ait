import { z } from "zod";
import type { components as SpotifyComponents } from "../openapi/openapi.spotify.types";

export interface BaseSpotifyEntityType {
  __type: "spotify_track" | "spotify_album" | "spotify_artist" | "spotify_playlist" | "spotify_recently_played";
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

const SpotifyImageSchema = z.object({
  url: z.string(),
  height: z.number(),
  width: z.number(),
});

export const SpotifyTrackEntityTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  durationMs: z.number(),
  explicit: z.boolean(),
  isPlayable: z.boolean().nullable(),
  previewUrl: z.string().nullable(),
  trackNumber: z.number().nullable(),
  discNumber: z.number().nullable(),
  uri: z.string().nullable(),
  href: z.string().nullable(),
  isLocal: z.boolean(),
  popularity: z.number().nullable(),
  albumData: z.record(z.string(), z.unknown()).nullable(),
  artistsData: z.array(z.record(z.string(), z.unknown())),
  externalIds: z.record(z.string(), z.unknown()).nullable(),
  externalUrls: z.record(z.string(), z.unknown()).nullable(),
  addedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  __type: z.literal("spotify_track"),
});

export const SpotifyArtistEntityTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  popularity: z.number(),
  genres: z.array(z.string()),
  images: z.array(SpotifyImageSchema).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  __type: z.literal("spotify_artist"),
});

export const SpotifyPlaylistTrackItemSchema = z.object({
  added_at: z.string().nullable(),
  track: z
    .object({
      id: z.string(),
      name: z.string(),
      artist: z.string(),
      album: z.string().nullable(),
      durationMs: z.number(),
      uri: z.string().nullable(),
    })
    .nullable(),
});

export type SpotifyPlaylistTrackItem = z.infer<typeof SpotifyPlaylistTrackItemSchema>;

export const SpotifyPlaylistEntityTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  public: z.boolean(),
  collaborative: z.boolean(),
  owner: z.string(),
  tracks: z.array(SpotifyPlaylistTrackItemSchema),
  followers: z.number(),
  snapshotId: z.string(),
  externalUrls: z.array(z.string()),
  uri: z.string(),
  href: z.string(),
  images: z.array(SpotifyImageSchema).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  __type: z.literal("spotify_playlist"),
});

export const SpotifyAlbumEntityTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  albumType: z.string(),
  artists: z.array(z.string()),
  tracks: z.array(z.string()),
  totalTracks: z.number(),
  releaseDate: z.string().nullable(),
  releaseDatePrecision: z.string().nullable(),
  isPlayable: z.boolean(),
  uri: z.string().nullable(),
  href: z.string().nullable(),
  popularity: z.number().nullable(),
  label: z.string().nullable(),
  copyrights: z.array(z.string()),
  externalIds: z.array(z.string()),
  genres: z.array(z.string()),
  images: z.array(SpotifyImageSchema).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  __type: z.literal("spotify_album"),
});

export const SpotifyRecentlyPlayedEntityTypeSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  trackName: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  durationMs: z.number(),
  explicit: z.boolean(),
  popularity: z.number().nullable(),
  playedAt: z.date(),
  context: z
    .object({
      type: z.string(),
      uri: z.string(),
    })
    .nullable(),
  albumData: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  __type: z.literal("spotify_recently_played"),
});

export type SpotifyTrackEntityType = z.infer<typeof SpotifyTrackEntityTypeSchema>;
export type SpotifyArtistEntityType = z.infer<typeof SpotifyArtistEntityTypeSchema>;
export type SpotifyPlaylistEntityType = z.infer<typeof SpotifyPlaylistEntityTypeSchema>;
export type SpotifyAlbumEntityType = z.infer<typeof SpotifyAlbumEntityTypeSchema>;
export type SpotifyRecentlyPlayedEntityType = z.infer<typeof SpotifyRecentlyPlayedEntityTypeSchema>;

type SpotifyArtist = SpotifyComponents["schemas"]["ArtistObject"];
type SpotifyTrack = SpotifyComponents["schemas"]["TrackObject"];
type SpotifyPlaylist = SpotifyComponents["schemas"]["PlaylistObject"];
type SpotifyAlbum = SpotifyComponents["schemas"]["AlbumObject"];
type SpotifyRecentlyPlayed = SpotifyComponents["schemas"]["PlayHistoryObject"];

export interface SpotifyTrackExternal extends Omit<SpotifyTrack, "__type">, BaseSpotifyEntityType {
  __type: "spotify_track";
}

export interface SpotifyArtistExternal extends Omit<SpotifyArtist, "__type">, BaseSpotifyEntityType {
  __type: "spotify_artist";
}

export interface SpotifyAlbumExternal extends Omit<SpotifyAlbum, "__type">, BaseSpotifyEntityType {
  __type: "spotify_album";
}

export interface SpotifyPlaylistExternal extends Omit<SpotifyPlaylist, "__type">, BaseSpotifyEntityType {
  __type: "spotify_playlist";
}

export interface SpotifyRecentlyPlayedExternal extends Omit<SpotifyRecentlyPlayed, "__type">, BaseSpotifyEntityType {
  __type: "spotify_recently_played";
}

export interface SpotifyPlaylistTrackExternal {
  added_at: string;
  added_by: {
    id: string;
    type: string;
    uri: string;
    href?: string;
    external_urls?: {
      spotify?: string;
    };
  };
  is_local: boolean;
  track: SpotifyTrackExternal | null;
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

export type SpotifyEntityType =
  | SpotifyTrackEntityType
  | SpotifyArtistEntityType
  | SpotifyPlaylistEntityType
  | SpotifyAlbumEntityType
  | SpotifyRecentlyPlayedEntityType;
export type SpotifyExternal =
  | SpotifyTrackExternal
  | SpotifyArtistExternal
  | SpotifyPlaylistExternal
  | SpotifyAlbumExternal
  | SpotifyRecentlyPlayedExternal;
