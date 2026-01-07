import type { OAuthTokenDataTarget } from "@ait/postgres";
import { ConnectorSpotifyRepository } from "../../../domain/entities/vendors/spotify/connector.spotify.repository";
import { BaseConnectorAbstract } from "../../../infrastructure/connector.base.abstract";
import type { IConnectorOAuth } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorSpotifyRepository } from "../../../types/domain/entities/vendors/connector.spotify.types";
import { ConnectorSpotifyAuthenticator } from "./connector.spotify.authenticator";
import { ConnectorSpotifyDataSource } from "./connector.spotify.data-source";
import { ConnectorSpotifyStore } from "./connector.spotify.store";

export class ConnectorSpotify extends BaseConnectorAbstract<
  ConnectorSpotifyAuthenticator,
  ConnectorSpotifyDataSource,
  ConnectorSpotifyStore,
  IConnectorSpotifyRepository
> {
  constructor(oauth: IConnectorOAuth) {
    const authenticator = new ConnectorSpotifyAuthenticator(oauth);
    const repository = new ConnectorSpotifyRepository(oauth.config.userId, oauth.config.connectorConfigId);
    const store = new ConnectorSpotifyStore(repository);
    super(authenticator, repository, store);
  }

  protected async getAuthenticatedData(): Promise<OAuthTokenDataTarget | null> {
    return this._store.getAuthenticationData();
  }

  protected async authenticate(code: string): Promise<{ access_token: string }> {
    return this._authenticator.authenticate(code);
  }

  protected async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    return this._authenticator.refreshToken(refreshToken);
  }

  protected createDataSource(accessToken: string): ConnectorSpotifyDataSource {
    return new ConnectorSpotifyDataSource(accessToken);
  }

  protected async saveAuthenticatedData(response: { access_token: string }): Promise<void> {
    await this._store.saveAuthenticationData(response);
  }

  protected async clearAuthenticatedData(): Promise<void> {
    await this._repository.clearAuthenticationData();
  }
}
