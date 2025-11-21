import { z } from "zod";
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

const SpotifyImageSchema = z.object({
  url: z.string(),
  height: z.number(),
  width: z.number(),
});

export const SpotifyTrackEntitySchema = z.object({
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
  __type: z.literal("track"),
});

export const SpotifyArtistEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  popularity: z.number(),
  genres: z.array(z.string()),
  images: z.array(SpotifyImageSchema).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  __type: z.literal("artist"),
});

export const SpotifyPlaylistEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  public: z.boolean(),
  collaborative: z.boolean(),
  owner: z.string(),
  tracks: z.array(z.string()),
  followers: z.number(),
  snapshotId: z.string(),
  externalUrls: z.array(z.string()),
  uri: z.string(),
  href: z.string(),
  images: z.array(SpotifyImageSchema).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  __type: z.literal("playlist"),
});

export const SpotifyAlbumEntitySchema = z.object({
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
  __type: z.literal("album"),
});

export const SpotifyRecentlyPlayedEntitySchema = z.object({
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
  __type: z.literal("recently_played"),
});

export type SpotifyTrackEntity = z.infer<typeof SpotifyTrackEntitySchema>;
export type SpotifyArtistEntity = z.infer<typeof SpotifyArtistEntitySchema>;
export type SpotifyPlaylistEntity = z.infer<typeof SpotifyPlaylistEntitySchema>;
export type SpotifyAlbumEntity = z.infer<typeof SpotifyAlbumEntitySchema>;
export type SpotifyRecentlyPlayedEntity = z.infer<typeof SpotifyRecentlyPlayedEntitySchema>;

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
