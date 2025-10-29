import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";

/**
 * Options for saving a track
 */
export interface IConnectorRepositorySaveOptions {
  incremental: boolean;
}

export interface IConnectorRepository {
  saveAuthenticationData(data: Partial<IConnectorOAuthTokenResponse>): Promise<void>;
  getAuthenticationData(): Promise<OAuthTokenDataTarget | null>;
  clearAuthenticationData(): Promise<void>;
}
