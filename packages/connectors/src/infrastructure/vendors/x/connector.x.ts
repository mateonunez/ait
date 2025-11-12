import { BaseConnectorAbstract } from "../../../infrastructure/connector.base.abstract";
import { ConnectorXStore } from "./connector.x.store";
import type { IConnectorXRepository } from "../../../types/domain/entities/vendors/connector.x.repository.types";
import type { IConnectorOAuth } from "../../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorXAuthenticator } from "./connector.x.authenticator";
import { ConnectorXDataSource } from "./connector.x.data-source";
import type { OAuthTokenDataTarget } from "@ait/postgres";
import { ConnectorXRepository } from "../../../domain/entities/vendors/x/connector.x.repository";

export class ConnectorX extends BaseConnectorAbstract<
  ConnectorXAuthenticator,
  ConnectorXDataSource,
  ConnectorXStore,
  IConnectorXRepository
> {
  constructor(oauth: IConnectorOAuth) {
    const authenticator = new ConnectorXAuthenticator(oauth);
    const repository = new ConnectorXRepository();
    const store = new ConnectorXStore(repository);
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

  protected createDataSource(accessToken: string): ConnectorXDataSource {
    return new ConnectorXDataSource(accessToken);
  }

  protected async saveAuthenticatedData(response: { access_token: string }): Promise<void> {
    await this._store.saveAuthenticationData(response);
  }

  protected async clearAuthenticatedData(): Promise<void> {
    await this._repository.clearAuthenticationData();
  }

  public getAuthenticator(): ConnectorXAuthenticator {
    return this._authenticator as ConnectorXAuthenticator;
  }
}
