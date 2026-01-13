import type { IConnectorOAuth, IConnectorOAuthConfig, IConnectorOAuthTokenResponse } from "./lib/oauth/connector.oauth";

export interface IConnectorAuthenticator {
  authenticate(code: string): Promise<IConnectorOAuthTokenResponse>;
  refreshToken(refreshToken: string): Promise<IConnectorOAuthTokenResponse>;
  revoke(refreshToken: string): Promise<void>;
  getOAuthConfig(): IConnectorOAuthConfig;
}

export abstract class ConnectorAuthenticatorAbstract implements IConnectorAuthenticator {
  protected oauth: IConnectorOAuth;

  constructor(oauth: IConnectorOAuth) {
    this.oauth = oauth;
  }

  async authenticate(code: string): Promise<IConnectorOAuthTokenResponse> {
    return await this.oauth.getAccessToken(code);
  }

  async refreshToken(refreshToken: string): Promise<IConnectorOAuthTokenResponse> {
    return await this.oauth.refreshAccessToken(refreshToken);
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.oauth.revokeAccessToken(refreshToken);
  }

  public getOAuthConfig(): IConnectorOAuthConfig {
    return this.oauth.config;
  }

  public getOAuth(): IConnectorOAuth {
    return this.oauth;
  }
}
