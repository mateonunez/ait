import type {
  PaginatedResponse,
  PaginationParams,
  SpotifyAlbumEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyRecentlyPlayedEntity,
  SpotifyTrackEntity,
} from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorSpotifyTrackRepository {
  saveTrack(track: SpotifyTrackEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveTracks(tracks: SpotifyTrackEntity[]): Promise<void>;

  getTrack(id: string): Promise<SpotifyTrackEntity | null>;
  fetchTracks(): Promise<SpotifyTrackEntity[]>;
  getTracksPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyTrackEntity>>;
}

export interface IConnectorSpotifyArtistRepository {
  saveArtist(artist: SpotifyArtistEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveArtists(artists: SpotifyArtistEntity[]): Promise<void>;

  getArtist(id: string): Promise<SpotifyArtistEntity | null>;
  fetchArtists(): Promise<SpotifyArtistEntity[]>;
  getArtistsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyArtistEntity>>;
}

export interface IConnectorSpotifyPlaylistRepository {
  savePlaylist(playlist: SpotifyPlaylistEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  savePlaylists(playlists: SpotifyPlaylistEntity[]): Promise<void>;

  getPlaylist(id: string): Promise<SpotifyPlaylistEntity | null>;
  fetchPlaylists(): Promise<SpotifyPlaylistEntity[]>;
  getPlaylistsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyPlaylistEntity>>;
}

export interface IConnectorSpotifyAlbumRepository {
  saveAlbum(album: SpotifyAlbumEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveAlbums(albums: SpotifyAlbumEntity[]): Promise<void>;

  getAlbum(id: string): Promise<SpotifyAlbumEntity | null>;
  fetchAlbums(): Promise<SpotifyAlbumEntity[]>;
  getAlbumsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyAlbumEntity>>;
}

export interface IConnectorSpotifyRecentlyPlayedRepository {
  saveRecentlyPlayed(item: SpotifyRecentlyPlayedEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveRecentlyPlayedBatch(items: SpotifyRecentlyPlayedEntity[]): Promise<void>;

  fetchRecentlyPlayed(limit?: number): Promise<SpotifyRecentlyPlayedEntity[]>;
  getRecentlyPlayedById(id: string): Promise<SpotifyRecentlyPlayedEntity | null>;
  getRecentlyPlayedPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyRecentlyPlayedEntity>>;
}

export interface IConnectorSpotifyRepository extends IConnectorRepository {
  track: IConnectorSpotifyTrackRepository;
  artist: IConnectorSpotifyArtistRepository;
  playlist: IConnectorSpotifyPlaylistRepository;
  album: IConnectorSpotifyAlbumRepository;
  recentlyPlayed: IConnectorSpotifyRecentlyPlayedRepository;
}
