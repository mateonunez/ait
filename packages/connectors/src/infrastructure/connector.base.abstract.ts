import type { OAuthTokenDataTarget } from "@ait/postgres";
import { AIT } from "../shared/constants/ait.constant";
import type { IConnector } from "../types/infrastructure/connector.interface";
import {
  ConnectorOAuthRefreshTokenExpiredError,
  ConnectorOAuthNetworkError,
  ConnectorOAuthRequestError,
} from "../shared/auth/lib/oauth/connector.oauth";
import { retryWithBackoff } from "../shared/utils/retry.utils";

/**
 * Shared connector logic for authenticating and reusing
 * existing sessions among multiple connector implementations.
 */
export abstract class BaseConnectorAbstract<AuthenticatorType, DataSourceType, StoreType, RepositoryType>
  implements IConnector<AuthenticatorType, DataSourceType, StoreType>
{
  protected _authenticator: AuthenticatorType;
  protected _dataSource?: DataSourceType;
  protected _store: StoreType;
  protected _repository: RepositoryType;
  private _refreshInProgress: Promise<void> | null = null;

  constructor(authenticator: AuthenticatorType, repository: RepositoryType, store: StoreType) {
    this._authenticator = authenticator;
    this._repository = repository;
    this._store = store;
  }

  public async connect(code = AIT): Promise<void> {
    const authenticatedData = await this.getAuthenticatedData();

    if (!authenticatedData) {
      await this._handleAuthentication(code);
      return;
    }

    await this._handleExistingAuthentication(authenticatedData);
  }

  private async _handleAuthentication(code: string): Promise<void> {
    const response = await this.authenticate(code);
    await this._updateDataSourceAndSaveAuth(response);
  }

  private async _handleExistingAuthentication(authenticatedData: any): Promise<void> {
    if (this._isTokenExpired(authenticatedData)) {
      if (this._refreshInProgress) {
        await this._refreshInProgress;

        const freshAuthData = await this.getAuthenticatedData();
        if (freshAuthData?.accessToken) {
          this._dataSource = this.createDataSource(freshAuthData.accessToken);
        }
        return;
      }

      this._refreshInProgress = this._handleTokenRefresh(authenticatedData).finally(() => {
        this._refreshInProgress = null;
      });

      await this._refreshInProgress;
      return;
    }

    this._dataSource = this.createDataSource(authenticatedData.accessToken);
  }

  private async _handleTokenRefresh(authenticatedData: OAuthTokenDataTarget): Promise<void> {
    const startTime = Date.now();
    const provider = authenticatedData.provider || "unknown";

    if (!authenticatedData.refreshToken) {
      await this._handleAuthentication(AIT);
      return;
    }

    try {
      const response = await retryWithBackoff(() => this.refreshToken(authenticatedData.refreshToken!), {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        shouldRetry: (error: Error, attempt: number) => {
          if (error instanceof ConnectorOAuthNetworkError) {
            console.warn(`[Connector:${provider}] Network error on attempt ${attempt}. Will retry...`, {
              provider,
              attempt,
              error: error.message,
            });
            return true;
          }
          return false;
        },
      });

      const duration = Date.now() - startTime;
      await this._updateDataSourceAndSaveAuth(response);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (error instanceof ConnectorOAuthRefreshTokenExpiredError) {
        console.warn(
          `[Connector:${provider}] Refresh token has expired or been revoked. Clearing stored tokens and triggering re-authentication...`,
          {
            provider,
            durationMs: duration,
            statusCode: error.statusCode,
          },
        );
        await this._clearAuthenticationData();
        await this._handleAuthentication(AIT);
      } else if (error instanceof ConnectorOAuthNetworkError) {
        console.error(`[Connector:${provider}] Network error during token refresh after all retry attempts`, {
          provider,
          durationMs: duration,
          error: error.message,
        });
        console.error("[Connector] Will retry on next connection attempt");
        throw error;
      } else if (error instanceof ConnectorOAuthRequestError) {
        console.error(`[Connector:${provider}] OAuth request failed`, {
          provider,
          statusCode: error.statusCode,
          durationMs: duration,
          responseBody: error.responseBody,
        });
        throw error;
      } else {
        console.error(`[Connector:${provider}] Unexpected error during token refresh`, {
          provider,
          durationMs: duration,
          error: error.message,
        });
        throw error;
      }
    }
  }

  private async _updateDataSourceAndSaveAuth(response: any): Promise<void> {
    this._dataSource = this.createDataSource(response.access_token);
    await this.saveAuthenticatedData(response);
  }

  private _isTokenExpired(authenticatedData: OAuthTokenDataTarget): boolean {
    if (!authenticatedData.expiresIn) {
      return false;
    }

    const now = new Date();
    const updatedAt = new Date(authenticatedData.updatedAt!);
    const elapsedTimeInMs = now.getTime() - updatedAt.getTime();
    const expirationInMs = Number(authenticatedData.expiresIn) * 1000;

    return elapsedTimeInMs >= expirationInMs;
  }

  private async _clearAuthenticationData(): Promise<void> {
    try {
      await this.clearAuthenticatedData();
    } catch (error: unknown) {
      console.error(
        "[Connector] Failed to clear authentication data:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  protected abstract getAuthenticatedData(): Promise<any>;
  protected abstract authenticate(code: string): Promise<{ access_token: string }>;
  protected abstract refreshToken(refreshToken: string): Promise<{ access_token: string }>;
  protected abstract createDataSource(accessToken: string): DataSourceType;
  protected abstract saveAuthenticatedData(response: { access_token: string }): Promise<void>;
  protected abstract clearAuthenticatedData(): Promise<void>;

  get authenticator(): AuthenticatorType {
    return this._authenticator;
  }
  set authenticator(authenticator: AuthenticatorType) {
    this._authenticator = authenticator;
  }

  get dataSource(): DataSourceType {
    return this._dataSource!;
  }
  set dataSource(ds: DataSourceType) {
    this._dataSource = ds;
  }

  get store(): StoreType {
    return this._store;
  }
  set store(store: StoreType) {
    this._store = store;
  }

  get repository(): RepositoryType {
    return this._repository;
  }
  set repository(repository: RepositoryType) {
    this._repository = repository;
  }
}
