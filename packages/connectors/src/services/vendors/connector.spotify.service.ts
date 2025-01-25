import type { SpotifyTrackEntity } from "@/domain/entities/vendors/connector.spotify.repository";
import type { ConnectorOAuth } from "@/shared/auth/lib/oauth/connector.oauth";
import { connectorSpotifyTrackMapper } from "@/domain/mappers/vendors/connector.spotify.mapper";
import { ConnectorSpotify } from "@/infrastructure/vendors/spotify/connector.spotify";
import { connectorConfigs } from "../connector.service.config";
import { ConnectorServiceBase } from "../connector.service.base.abstract";

export class ConnectorSpotifyService extends ConnectorServiceBase<ConnectorSpotify, SpotifyTrackEntity> {
  constructor() {
    super(connectorConfigs.spotify!);
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorSpotify {
    return new ConnectorSpotify(oauth);
  }

  async getTracks(): Promise<SpotifyTrackEntity[]> {
    return this.fetchEntities(
      () => this._connector.dataSource?.fetchTopTracks() || Promise.resolve([]),
      (track) => connectorSpotifyTrackMapper.externalToDomain(track),
    );
  }
}
