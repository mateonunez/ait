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
} from "@ait/core";
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
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.TRACK, true);
  }

  async getArtists(): Promise<SpotifyArtistEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.ARTIST, true);
  }

  async getPlaylists(): Promise<SpotifyPlaylistEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST, true);
  }

  async getPlaylistById(playlistId: string): Promise<SpotifyPlaylistEntity> {
    const playlist = await this.connector.dataSource.fetchPlaylistById(playlistId);
    return connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST].mapper(playlist);
  }

  async getAlbums(): Promise<SpotifyAlbumEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.ALBUM, true);
  }

  async getRecentlyPlayed(): Promise<SpotifyRecentlyPlayedEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED, true);
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
