import type {
  IConnectorRepository,
  IConnectorRepositorySaveOptions,
} from "@/types/domain/entities/connector.repository.interface";
import type { components as SpotifyComponents } from "@/types/openapi/openapi.spotify.types";

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

export interface IConnectorSpotifyRepository extends IConnectorRepository {
  track: IConnectorSpotifyTrackRepository;
  artist: IConnectorSpotifyArtistRepository;
}

export interface BaseSpotifyEntity {
  __type: "track" | "album" | "artist" | "playlist";
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

type SpotifyArtist = SpotifyComponents["schemas"]["ArtistObject"];

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

type SpotifyTrack = SpotifyComponents["schemas"]["TrackObject"];

export interface SpotifyTrackExternal extends Omit<SpotifyTrack, "__type">, BaseSpotifyEntity {
  __type: "track";
}

export interface SpotifyArtistExternal extends Omit<SpotifyArtist, "__type">, BaseSpotifyEntity {
  __type: "artist";
}

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

export type SpotifyEntity = SpotifyTrackEntity | SpotifyArtistEntity; // | SpotifyAlbumEntity | SpotifyPlaylistEntity;
export type SpotifyExternal = SpotifyTrackExternal | SpotifyArtistExternal; // | SpotifyAlbum | SpotifyPlaylist;
