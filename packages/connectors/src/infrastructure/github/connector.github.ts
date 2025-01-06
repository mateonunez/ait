import { BaseConnectorAbstract } from "./../connector.base.abstract";
import { ConnectorGitHubRepository } from "../../domain/entities/github/connector.github.repository";
import type { IConnectorGitHubRepository } from "../../domain/entities/github/connector.github.repository.interface";
import type { IConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth.interface";
import { ConnectorGitHubAuthenticator } from "../github/authenticator/connector.github.authenticator";
import { ConnectorGitHubDataSource } from "../github/data-source/connector.github.data-source";
import { ConnectorGitHubStore } from "../github/store/connector.github.store";
import type { OAuthTokenDataTarget } from "@ait/postgres";

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

  protected createDataSource(accessToken: string): ConnectorGitHubDataSource {
    return new ConnectorGitHubDataSource(accessToken);
  }

  protected async saveAuthenticatedData(response: { access_token: string }): Promise<void> {
    await this._store.saveAuthenticationData(response);
  }
}
