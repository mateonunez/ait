export interface IConnectorOAuthConfig {
  clientId: string;
  clientSecret: string;
  endpoint: string;
  redirectUri?: string;
}

export interface IConnectorOAuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface IConnectorOAuth {
  getAccessToken(code: string): Promise<IConnectorOAuthTokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<IConnectorOAuthTokenResponse>;
  revokeAccessToken(accessToken: string): Promise<void>;
  readonly config: IConnectorOAuthConfig;
}
