import type {
  SpotifyArtistEntity,
  SpotifyArtistExternal,
  SpotifyTrackEntity,
  SpotifyTrackExternal,
} from "@/types/domain/entities/vendors/connector.spotify.repository.types";
import type { ConnectorOAuth } from "@/shared/auth/lib/oauth/connector.oauth";
import { ConnectorSpotify } from "@/infrastructure/vendors/spotify/connector.spotify";
import { connectorConfigs } from "../connector.service.config";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import {
  connectorEntityConfigs,
  SPOTIFY_ENTITY_TYPES_ENUM,
  type SpotifyServiceEntityMap,
} from "./connector.vendors.config";

export class ConnectorSpotifyService extends ConnectorServiceBase<ConnectorSpotify, SpotifyServiceEntityMap> {
  constructor() {
    super(connectorConfigs.spotify!);

    this.registerEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.TRACK, SpotifyTrackExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.TRACK,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.TRACK],
    );
    this.registerEntityConfig<SPOTIFY_ENTITY_TYPES_ENUM.ARTIST, SpotifyArtistExternal>(
      SPOTIFY_ENTITY_TYPES_ENUM.ARTIST,
      connectorEntityConfigs.spotify[SPOTIFY_ENTITY_TYPES_ENUM.ARTIST],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorSpotify {
    return new ConnectorSpotify(oauth);
  }

  async getTracks(): Promise<SpotifyTrackEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.TRACK);
  }

  async getArtists(): Promise<SpotifyArtistEntity[]> {
    return this.fetchEntities(SPOTIFY_ENTITY_TYPES_ENUM.ARTIST);
  }
}
