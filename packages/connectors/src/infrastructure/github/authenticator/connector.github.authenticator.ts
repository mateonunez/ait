import type { ConnectorOAuth } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth.interface";
import type { IConnectorGitHubAuthenticator } from "./connector.github.authenticator.interface";

export class ConnectorGitHubAuthenticator implements IConnectorGitHubAuthenticator {
  private oauth: ConnectorOAuth;

  constructor(oauth: ConnectorOAuth) {
    this.oauth = oauth;
  }

  async authenticate(code: string): Promise<IConnectorOAuthTokenResponse> {
    return await this.oauth.getAccessToken(code);
  }

  async refreshToken(
    refreshToken: string
  ): Promise<IConnectorOAuthTokenResponse> {
    return await this.oauth.refreshAccessToken(refreshToken);
  }
}
