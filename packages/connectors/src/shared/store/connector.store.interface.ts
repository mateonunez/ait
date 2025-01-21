import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../auth/lib/oauth/connector.oauth";

export interface IConnectorStore {
  save(data: any): Promise<void>;
  saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void>;
  getAuthenticationData(): Promise<OAuthTokenDataTarget | null>;
}
