import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth.interface";

export interface IConnectorGitHubAuthenticator {
  authenticate(code: string): Promise<IConnectorOAuthTokenResponse>;
  refreshToken(refreshToken: string): Promise<IConnectorOAuthTokenResponse>;
}
