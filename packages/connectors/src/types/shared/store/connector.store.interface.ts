import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";

export interface IConnectorStore<TEntity = unknown> {
  save(data: TEntity | TEntity[]): Promise<void>;
  saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void>;
  getAuthenticationData(): Promise<OAuthTokenDataTarget | null>;
}
