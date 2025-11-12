import type {
  SpotifyTrackEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyAlbumEntity,
  SpotifyRecentlyPlayedEntity,
} from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

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

export interface IConnectorSpotifyRecentlyPlayedRepository {
  saveRecentlyPlayed(item: SpotifyRecentlyPlayedEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveRecentlyPlayedBatch(items: SpotifyRecentlyPlayedEntity[]): Promise<void>;

  getRecentlyPlayed(limit?: number): Promise<SpotifyRecentlyPlayedEntity[]>;
  getRecentlyPlayedById(id: string): Promise<SpotifyRecentlyPlayedEntity | null>;
}

export interface IConnectorSpotifyRepository extends IConnectorRepository {
  track: IConnectorSpotifyTrackRepository;
  artist: IConnectorSpotifyArtistRepository;
  playlist: IConnectorSpotifyPlaylistRepository;
  album: IConnectorSpotifyAlbumRepository;
  recentlyPlayed: IConnectorSpotifyRecentlyPlayedRepository;
}
