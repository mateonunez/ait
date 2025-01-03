import type { IConnectorOAuthTokenResponse } from "./lib/oauth/connector.oauth.interface";

export interface IConnectorAuthenticator {
  authenticate(code: string): Promise<IConnectorOAuthTokenResponse>;
  refreshToken(refreshToken: string): Promise<IConnectorOAuthTokenResponse>;
  revoke(refreshToken: string): Promise<void>;
}
