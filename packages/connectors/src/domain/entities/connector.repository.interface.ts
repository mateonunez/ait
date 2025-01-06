import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../shared/auth/lib/oauth/connector.oauth.interface";

export interface IConnectorRepository {
  saveAuthenticationData(data: Partial<IConnectorOAuthTokenResponse>): Promise<void>;
  getAuthenticationData(): Promise<OAuthTokenDataTarget | null>;
}
