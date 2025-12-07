import type { OAuthTokenDataTarget } from "@ait/postgres";
import { ConnectorSlackRepository } from "../../../domain/entities/vendors/slack/connector.slack.repository";
import { BaseConnectorAbstract } from "../../../infrastructure/connector.base.abstract";
import type { IConnectorOAuth } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorSlackRepository } from "../../../types/domain/entities/vendors/connector.slack.types";
import { ConnectorSlackAuthenticator } from "./connector.slack.authenticator";
import { ConnectorSlackDataSource } from "./connector.slack.data-source";
import { ConnectorSlackStore } from "./connector.slack.store";

export class ConnectorSlack extends BaseConnectorAbstract<
  ConnectorSlackAuthenticator,
  ConnectorSlackDataSource,
  ConnectorSlackStore,
  IConnectorSlackRepository
> {
  constructor(oauth: IConnectorOAuth) {
    const authenticator = new ConnectorSlackAuthenticator(oauth);
    const repository = new ConnectorSlackRepository();
    const store = new ConnectorSlackStore(repository);
    super(authenticator, repository, store);
  }

  protected async getAuthenticatedData(): Promise<OAuthTokenDataTarget | null> {
    return this._store.getAuthenticationData();
  }

  protected async authenticate(code: string): Promise<{ access_token: string; metadata: Record<string, unknown> }> {
    const response = await this._authenticator.authenticate(code);
    const userToken = response.authed_user?.access_token;
    const teamId = (response.team as { id: string })?.id;

    return {
      access_token: userToken || response.access_token,
      metadata: {
        team_id: teamId,
      },
    };
  }

  protected async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    const response = await this._authenticator.refreshToken(refreshToken);
    const userToken = response.authed_user?.access_token;
    return {
      access_token: userToken || response.access_token,
    };
  }

  protected createDataSource(accessToken: string): ConnectorSlackDataSource {
    return new ConnectorSlackDataSource(accessToken);
  }

  protected async saveAuthenticatedData(response: {
    access_token: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this._store.saveAuthenticationData(response);
  }

  protected async clearAuthenticatedData(): Promise<void> {
    await this._repository.clearAuthenticationData();
  }
}
