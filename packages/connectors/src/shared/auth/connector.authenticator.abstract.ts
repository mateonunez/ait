import type { IConnectorAuthenticator } from "./connector.authenticator.interface";
import type { IConnectorOAuth, IConnectorOAuthTokenResponse } from "./lib/oauth/connector.oauth.interface";

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
}
