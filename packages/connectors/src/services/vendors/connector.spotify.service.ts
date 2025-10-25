import type {
  SpotifyArtistEntity,
  SpotifyArtistExternal,
  SpotifyTrackEntity,
  SpotifyTrackExternal,
  SpotifyPlaylistEntity,
  SpotifyPlaylistExternal,
  SpotifyAlbumExternal,
  SpotifyAlbumEntity,
  SpotifyRecentlyPlayedEntity,
  SpotifyRecentlyPlayedExternal,
  SpotifyCurrentlyPlayingExternal,
} from "../../types/domain/entities/vendors/connector.spotify.types";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorSpotify } from "../../infrastructure/vendors/spotify/connector.spotify";
import { getConnectorConfig } from "../connector.service.config";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import {
  connectorEntityConfigs,
  SPOTIFY_ENTITY_TYPES_ENUM,
  type SpotifyServiceEntityMap,
} from "./connector.vendors.config";
import { connectorSpotifyTrackMapper } from "../../domain/mappers/vendors/connector.spotify.mapper";

export class ConnectorSpotifyService extends ConnectorServiceBase<ConnectorSpotify, SpotifyServiceEntityMap> {
  constructor() {
    super(getConnectorConfig("spotify"));

    this.registerEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.TRACK, SpotifyTrackExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.TRACK,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.TRACK],
    );
    this.registerEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.ARTIST, SpotifyArtistExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.ARTIST,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.ARTIST],
    );
    this.registerEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST, SpotifyPlaylistExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST],
    );
    this.registerEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.ALBUM, SpotifyAlbumExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.ALBUM,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.ALBUM],
    );
    this.registerEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED, SpotifyRecentlyPlayedExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorSpotify {
    return new ConnectorSpotify(oauth);
  }

  async getTracks(): Promise<SpotifyTrackEntity[]> {
    await this.connector.connect();
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.TRACK);
  }

  async getArtists(): Promise<SpotifyArtistEntity[]> {
    await this.connector.connect();
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.ARTIST);
  }

  async getPlaylists(): Promise<SpotifyPlaylistEntity[]> {
    await this.connector.connect();
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST);
  }

  async getPlaylistById(playlistId: string): Promise<SpotifyPlaylistEntity> {
    const playlist = await this.connector.dataSource.fetchPlaylistById(playlistId);
    return connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST].mapper(playlist);
  }

  async getAlbums(): Promise<SpotifyAlbumEntity[]> {
    await this.connector.connect();
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.ALBUM);
  }

  async getRecentlyPlayed(): Promise<SpotifyRecentlyPlayedEntity[]> {
    await this.connector.connect(); // needed for the AI tool
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED);
  }

  async getCurrentlyPlaying(): Promise<
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
        trackEntity: connectorSpotifyTrackMapper.externalToDomain(response.item),
      },
    };
  }
}
