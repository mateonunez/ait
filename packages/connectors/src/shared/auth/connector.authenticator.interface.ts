export interface IConnectorAuthenticator {
  authenticate(): Promise<string>;
  refreshToken(): Promise<string>;
  revoke(): Promise<void>;
}
