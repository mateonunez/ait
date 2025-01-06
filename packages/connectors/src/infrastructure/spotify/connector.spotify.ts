import { ConnectorSpotifyRepository } from "../../domain/entities/spotify/connector.spotify.repository";
import type { IConnectorSpotifyRepository } from "../../domain/entities/spotify/connector.spotify.repository.interface";
import type { IConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth.interface";
import { BaseConnectorAbstract } from "../connector.base.abstract";
import { ConnectorSpotifyAuthenticator } from "./authenticator/connector.spotify.authenticator";
import { ConnectorSpotifyDataSource } from "./data-source/connector.spotify.data-source";
import { ConnectorSpotifyStore } from "./store/connector.spotify.store";

export class ConnectorSpotify extends BaseConnectorAbstract<
  ConnectorSpotifyAuthenticator,
  ConnectorSpotifyDataSource,
  ConnectorSpotifyStore,
  IConnectorSpotifyRepository
> {
  constructor(oauth: IConnectorOAuth) {
    const authenticator = new ConnectorSpotifyAuthenticator(oauth);
    const repository = new ConnectorSpotifyRepository();
    const store = new ConnectorSpotifyStore(repository);
    super(authenticator, repository, store);
  }

  protected async getAuthenticatedData(): Promise<any> {
    return this._store.getAuthenticationData();
  }

  protected async authenticate(code: string): Promise<{ access_token: string }> {
    return this._authenticator.authenticate(code);
  }

  protected createDataSource(accessToken: string): ConnectorSpotifyDataSource {
    return new ConnectorSpotifyDataSource(accessToken);
  }

  protected async saveAuthenticatedData(response: { access_token: string }): Promise<void> {
    await this._store.saveAuthenticationData(response);
  }
}
