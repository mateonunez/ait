import { BaseConnectorAbstract } from "@/infrastructure/connector.base.abstract";
import { ConnectorGitHubAuthenticator } from "./authenticator/connector.github.authenticator";
import {
  type IConnectorGitHubRepository,
  ConnectorGitHubRepository,
} from "@/domain/entities/vendors/connector.github.repository";
import type { IConnectorOAuth } from "@/shared/auth/lib/oauth/connector.oauth";
import type { OAuthTokenDataTarget } from "@ait/postgres";
import { ConnectorGitHubDataSource } from "./data-source/connector.github.data-source";
import { ConnectorGitHubStore } from "./store/connector.github.store";

export class ConnectorGitHub extends BaseConnectorAbstract<
  ConnectorGitHubAuthenticator,
  ConnectorGitHubDataSource,
  ConnectorGitHubStore,
  IConnectorGitHubRepository
> {
  constructor(oauth: IConnectorOAuth) {
    const authenticator = new ConnectorGitHubAuthenticator(oauth);
    const repository = new ConnectorGitHubRepository();
    const store = new ConnectorGitHubStore(repository);
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

  protected createDataSource(accessToken: string): ConnectorGitHubDataSource {
    return new ConnectorGitHubDataSource(accessToken);
  }

  protected async saveAuthenticatedData(response: { access_token: string }): Promise<void> {
    await this._store.saveAuthenticationData(response);
  }
}
