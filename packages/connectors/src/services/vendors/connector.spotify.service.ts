import type {
  SpotifyArtist,
  SpotifyArtistEntity,
  SpotifyTrack,
  SpotifyTrackEntity,
} from "@/types/domain/entities/vendors/connector.spotify.repository.types";
import type { ConnectorOAuth } from "@/shared/auth/lib/oauth/connector.oauth";
import { ConnectorSpotify } from "@/infrastructure/vendors/spotify/connector.spotify";
import { connectorConfigs } from "../connector.service.config";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { connectorEntityConfigs } from "./entities/connector.entity.config";

export interface SpotifyServiceEntityMap {
  track: SpotifyTrackEntity;
  artist: SpotifyArtistEntity;
}

export class ConnectorSpotifyService extends ConnectorServiceBase<ConnectorSpotify, SpotifyServiceEntityMap> {
  constructor() {
    super(connectorConfigs.spotify!);

    this.registerEntityConfig<"track", SpotifyTrack>("track", {
      fetcher: () => connectorEntityConfigs.spotify.track.fetcher(this._connector),
      mapper: connectorEntityConfigs.spotify.track.mapper,
    });

    this.registerEntityConfig<"artist", SpotifyArtist>("artist", {
      fetcher: () => connectorEntityConfigs.spotify.artist.fetcher(this._connector),
      mapper: connectorEntityConfigs.spotify.artist.mapper,
    });
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorSpotify {
    return new ConnectorSpotify(oauth);
  }

  async getTracks(): Promise<SpotifyTrackEntity[]> {
    return this.fetchEntities("track");
  }

  async getArtists(): Promise<SpotifyArtistEntity[]> {
    return this.fetchEntities("artist");
  }
}
