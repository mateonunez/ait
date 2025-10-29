import { BaseConnectorAbstract } from "../../../infrastructure/connector.base.abstract";
import { ConnectorGitHubAuthenticator } from "./connector.github.authenticator";
import { ConnectorGitHubRepository } from "../../../domain/entities/vendors/connector.github.repository";
import type { IConnectorOAuth } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { OAuthTokenDataTarget } from "@ait/postgres";
import { ConnectorGitHubDataSource } from "./connector.github.data-source";
import { ConnectorGitHubStore } from "./connector.github.store";
import type { IConnectorGitHubRepository } from "../../../types/domain/entities/vendors/connector.github.repository.types";

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

  protected async clearAuthenticatedData(): Promise<void> {
    await this._repository.clearAuthenticationData();
  }
}
