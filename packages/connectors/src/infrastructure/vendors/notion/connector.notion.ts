import type { OAuthTokenDataTarget } from "@ait/postgres";
import { ConnectorNotionRepository } from "../../../domain/entities/vendors/notion/connector.notion.repository";
import { BaseConnectorAbstract } from "../../../infrastructure/connector.base.abstract";
import type { IConnectorOAuth } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorNotionRepository } from "../../../types/domain/entities/vendors/connector.notion.types";
import { ConnectorNotionAuthenticator } from "./connector.notion.authenticator";
import { ConnectorNotionDataSource } from "./connector.notion.data-source";
import { ConnectorNotionStore } from "./connector.notion.store";

export class ConnectorNotion extends BaseConnectorAbstract<
  ConnectorNotionAuthenticator,
  ConnectorNotionDataSource,
  ConnectorNotionStore,
  IConnectorNotionRepository
> {
  constructor(oauth: IConnectorOAuth) {
    const authenticator = new ConnectorNotionAuthenticator(oauth);
    const repository = new ConnectorNotionRepository(oauth.config.userId, oauth.config.connectorConfigId);
    const store = new ConnectorNotionStore(repository);
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

  protected createDataSource(accessToken: string): ConnectorNotionDataSource {
    return new ConnectorNotionDataSource(accessToken);
  }

  protected async saveAuthenticatedData(response: { access_token: string }): Promise<void> {
    await this._store.saveAuthenticationData(response);
  }

  protected async clearAuthenticatedData(): Promise<void> {
    await this._repository.clearAuthenticationData();
  }
}
