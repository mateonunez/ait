import type {
  PaginatedResponse,
  PaginationParams,
  SpotifyAlbumExternal,
  SpotifyArtistExternal,
  SpotifyCurrentlyPlayingExternal,
  SpotifyPlaylistExternal,
  SpotifyRecentlyPlayedExternal,
  SpotifyTrackExternal,
} from "@ait/core";
import {
  type SpotifyAlbumEntity,
  type SpotifyArtistEntity,
  type SpotifyPlaylistEntity,
  type SpotifyRecentlyPlayedEntity,
  type SpotifyTrackEntity,
  mapSpotifyTrack,
} from "@ait/core";
import { ConnectorSpotify } from "../../infrastructure/vendors/spotify/connector.spotify";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { getConnectorConfig } from "../connector.service.config";
import {
  SPOTIFY_ENTITY_TYPES_ENUM,
  type SpotifyServiceEntityMap,
  connectorEntityConfigs,
} from "./connector.vendors.config";

export interface IConnectorSpotifyService extends ConnectorServiceBase<ConnectorSpotify, SpotifyServiceEntityMap> {
  fetchTracks(): Promise<SpotifyTrackEntity[]>;
  fetchArtists(): Promise<SpotifyArtistEntity[]>;
  fetchPlaylists(): Promise<SpotifyPlaylistEntity[]>;
  fetchPlaylistById(playlistId: string): Promise<SpotifyPlaylistEntity>;
  fetchAlbums(): Promise<SpotifyAlbumEntity[]>;
  fetchRecentlyPlayed(): Promise<SpotifyRecentlyPlayedEntity[]>;
  fetchCurrentlyPlaying(): Promise<SpotifyCurrentlyPlayingExternal | null>;

  getTracksPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyTrackEntity>>;
  getArtistsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyArtistEntity>>;
  getPlaylistsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyPlaylistEntity>>;
  getAlbumsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyAlbumEntity>>;
  getRecentlyPlayedPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyRecentlyPlayedEntity>>;
}

export class ConnectorSpotifyService
  extends ConnectorServiceBase<ConnectorSpotify, SpotifyServiceEntityMap>
  implements IConnectorSpotifyService
{
  constructor() {
    super(getConnectorConfig("spotify"));

    this.registerPaginatedEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.TRACK, SpotifyTrackExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.TRACK,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.TRACK],
    );
    this.registerEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.ARTIST, SpotifyArtistExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.ARTIST,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.ARTIST],
    );
    this.registerPaginatedEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST, SpotifyPlaylistExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST],
    );
    this.registerPaginatedEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.ALBUM, SpotifyAlbumExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.ALBUM,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.ALBUM],
    );
    this.registerPaginatedEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED, SpotifyRecentlyPlayedExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorSpotify {
    return new ConnectorSpotify(oauth);
  }

  async fetchTracks(): Promise<SpotifyTrackEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.TRACK, true);
  }

  async fetchArtists(): Promise<SpotifyArtistEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.ARTIST, true);
  }

  async fetchPlaylists(): Promise<SpotifyPlaylistEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST, true);
  }

  async fetchPlaylistById(playlistId: string): Promise<SpotifyPlaylistEntity> {
    const playlist = await this.connector.dataSource.fetchPlaylistById(playlistId);
    return connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST].mapper(playlist);
  }

  async fetchAlbums(): Promise<SpotifyAlbumEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.ALBUM, true);
  }

  async fetchRecentlyPlayed(): Promise<SpotifyRecentlyPlayedEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED, true);
  }

  async fetchCurrentlyPlaying(): Promise<
    | (SpotifyCurrentlyPlayingExternal & {
        item: SpotifyTrackExternal & { trackEntity: SpotifyTrackEntity };
      })
    | null
  > {
    await this.connector.connect();

    const response = await this.connector.dataSource.fetchCurrentlyPlaying();

    if (!response) {
      return null;
    }

    return {
      ...response,
      item: {
        ...response.item,
        trackEntity: mapSpotifyTrack(response.item),
      },
    };
  }

  async getTracksPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyTrackEntity>> {
    return this.connector.repository.track.getTracksPaginated(params);
  }

  async getArtistsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyArtistEntity>> {
    return this.connector.repository.artist.getArtistsPaginated(params);
  }

  async getPlaylistsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyPlaylistEntity>> {
    return this.connector.repository.playlist.getPlaylistsPaginated(params);
  }

  async getAlbumsPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyAlbumEntity>> {
    return this.connector.repository.album.getAlbumsPaginated(params);
  }

  async getRecentlyPlayedPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyRecentlyPlayedEntity>> {
    return this.connector.repository.recentlyPlayed.getRecentlyPlayedPaginated(params);
  }
}
