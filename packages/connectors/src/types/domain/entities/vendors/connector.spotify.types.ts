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

export interface IConnectorSpotifyPlaylistRepository {
  savePlaylist(playlist: SpotifyPlaylistEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  savePlaylists(playlists: SpotifyPlaylistEntity[]): Promise<void>;

  getPlaylist(id: string): Promise<SpotifyPlaylistEntity | null>;
  getPlaylists(): Promise<SpotifyPlaylistEntity[]>;
}

export interface IConnectorSpotifyAlbumRepository {
  saveAlbum(album: SpotifyAlbumEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveAlbums(albums: SpotifyAlbumEntity[]): Promise<void>;

  getAlbum(id: string): Promise<SpotifyAlbumEntity | null>;
  getAlbums(): Promise<SpotifyAlbumEntity[]>;
}

export interface IConnectorSpotifyRepository extends IConnectorRepository {
  track: IConnectorSpotifyTrackRepository;
  artist: IConnectorSpotifyArtistRepository;
  playlist: IConnectorSpotifyPlaylistRepository;
  album: IConnectorSpotifyAlbumRepository;
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
  createdAt: Date;
  updatedAt: Date;
  __type: "album";
}

type SpotifyArtist = SpotifyComponents["schemas"]["ArtistObject"];
type SpotifyTrack = SpotifyComponents["schemas"]["TrackObject"];
type SpotifyPlaylist = SpotifyComponents["schemas"]["PlaylistObject"];
type SpotifyAlbum = SpotifyComponents["schemas"]["AlbumObject"];

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

export type SpotifyEntity = SpotifyTrackEntity | SpotifyArtistEntity | SpotifyPlaylistEntity | SpotifyAlbumEntity;
export type SpotifyExternal =
  | SpotifyTrackExternal
  | SpotifyArtistExternal
  | SpotifyPlaylistExternal
  | SpotifyAlbumExternal;
