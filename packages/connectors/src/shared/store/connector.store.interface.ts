import type { IConnectorOAuthTokenResponse } from "../auth/lib/oauth/connector.oauth.interface";
export interface IConnectorStore {
  save(data: any): Promise<void>;
  saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void>;
}
