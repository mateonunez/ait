import type { OAuthTokenDataTarget } from "@ait/postgres";
import { ConnectorGoogleRepository } from "../../../domain/entities/vendors/google/connector.google.repository";
import type { IConnectorOAuth } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorGoogleRepository } from "../../../types/domain/entities/vendors/connector.google.types";
import { BaseConnectorAbstract } from "../../connector.base.abstract";
import { ConnectorGoogleAuthenticator } from "./connector.google.authenticator";
import { ConnectorGoogleDataSource } from "./connector.google.data-source";
import { ConnectorGoogleStore } from "./connector.google.store";

export class ConnectorGoogle extends BaseConnectorAbstract<
  ConnectorGoogleAuthenticator,
  ConnectorGoogleDataSource,
  ConnectorGoogleStore,
  IConnectorGoogleRepository
> {
  constructor(oauth: IConnectorOAuth) {
    const authenticator = new ConnectorGoogleAuthenticator(oauth);
    const repository = new ConnectorGoogleRepository();
    const store = new ConnectorGoogleStore(repository);
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

  protected createDataSource(accessToken: string): ConnectorGoogleDataSource {
    return new ConnectorGoogleDataSource(accessToken);
  }

  protected async saveAuthenticatedData(response: { access_token: string }): Promise<void> {
    await this._store.saveAuthenticationData(response);
  }

  protected async clearAuthenticatedData(): Promise<void> {
    await this._repository.clearAuthenticationData();
  }
}
