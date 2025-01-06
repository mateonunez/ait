import type { IConnectorOAuthTokenResponse } from "../../shared/auth/lib/oauth/connector.oauth.interface";

export interface IConnectorRepository {
  saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void>;
}
