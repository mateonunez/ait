import type { OAuthTokenDataTarget } from "@ait/postgres";
import { ConnectorLinearRepository } from "../../../domain/entities/vendors/linear/connector.linear.repository";
import { BaseConnectorAbstract } from "../../../infrastructure/connector.base.abstract";
import type { IConnectorOAuth } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorLinearRepository } from "../../../types/domain/entities/vendors/connector.linear.types";
import { ConnectorLinearAuthenticator } from "./connector.linear.authenticator";
import { ConnectorLinearDataSource } from "./connector.linear.data-source";
import { ConnectorLinearStore } from "./connector.linear.store";

export class ConnectorLinear extends BaseConnectorAbstract<
  ConnectorLinearAuthenticator,
  ConnectorLinearDataSource,
  ConnectorLinearStore,
  IConnectorLinearRepository
> {
  constructor(oauth: IConnectorOAuth) {
    const authenticator = new ConnectorLinearAuthenticator(oauth);
    const repository = new ConnectorLinearRepository();
    const store = new ConnectorLinearStore(repository);
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

  protected createDataSource(accessToken: string): ConnectorLinearDataSource {
    return new ConnectorLinearDataSource(accessToken);
  }

  protected async saveAuthenticatedData(response: { access_token: string }): Promise<void> {
    await this._store.saveAuthenticationData(response);
  }

  protected async clearAuthenticatedData(): Promise<void> {
    await this._repository.clearAuthenticationData();
  }
}
