import type { OAuthTokenDataTarget } from "@ait/postgres";
import { AIT } from "../shared/constants/ait.constant";
import type { IConnector } from "../types/infrastructure/connector.interface";
import {
  ConnectorOAuthRefreshTokenExpiredError,
  ConnectorOAuthNetworkError,
  ConnectorOAuthRequestError,
} from "../shared/auth/lib/oauth/connector.oauth";
import { retryWithBackoff } from "../shared/utils/retry.utils";
import { getLogger, type Logger } from "@ait/core";
import { createHash } from "node:crypto";

export abstract class BaseConnectorAbstract<AuthenticatorType, DataSourceType, StoreType, RepositoryType>
  implements IConnector<AuthenticatorType, DataSourceType, StoreType>
{
  protected _authenticator: AuthenticatorType;
  protected _dataSource?: DataSourceType;
  protected _store: StoreType;
  protected _repository: RepositoryType;
  private _refreshInProgress: Promise<void> | null = null;
  protected _logger: Logger;

  constructor(authenticator: AuthenticatorType, repository: RepositoryType, store: StoreType) {
    this._authenticator = authenticator;
    this._repository = repository;
    this._store = store;
    this._logger = getLogger();
  }

  public async connect(code = AIT): Promise<void> {
    if (code !== AIT) {
      this._logger.info("[Connector] Code provided. Authenticating...");
      await this._handleAuthentication(code);
      return;
    }

    const authenticatedData = await this.getAuthenticatedData();

    if (!authenticatedData) {
      this._logger.info("[Connector] No existing authentication found. Authenticating...");
      await this._handleAuthentication(code);
      return;
    }

    this._logger.info("[Connector] Found existing authentication. Verifying token...");
    await this._handleExistingAuthentication(authenticatedData);
  }

  public async getSessionId(): Promise<string> {
    const data = await this.getAuthenticatedData();
    if (!data?.accessToken) return "anonymous";

    return createHash("sha256").update(data.accessToken).digest("hex");
  }

  private async _handleAuthentication(code: string): Promise<void> {
    const response = await this.authenticate(code);
    await this._updateDataSourceAndSaveAuth(response);
  }

  private async _handleExistingAuthentication(authenticatedData: any): Promise<void> {
    if (this._isTokenExpired(authenticatedData)) {
      this._logger.info("[Connector] Token expired. Refreshing...");
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
    const _logger = this._logger.child({ provider, operation: "refresh_token" });

    if (!authenticatedData.refreshToken) {
      _logger.warn("No refresh token available. Re-authenticating...");
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
            _logger.warn(`Network error on attempt ${attempt}. Will retry...`, { error: error.message });
            return true;
          }
          return false;
        },
      });

      const duration = Date.now() - startTime;
      _logger.info("Token refreshed successfully", { durationMs: duration });
      await this._updateDataSourceAndSaveAuth(response);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      if (error instanceof ConnectorOAuthRefreshTokenExpiredError) {
        _logger.warn(
          "Refresh token has expired or been revoked. Clearing stored tokens and triggering re-authentication...",
          {
            durationMs: duration,
            statusCode: error.statusCode,
          },
        );
        await this._clearAuthenticationData();
        await this._handleAuthentication(AIT);
      } else if (error instanceof ConnectorOAuthNetworkError) {
        _logger.error("Network error during token refresh after all retry attempts", {
          durationMs: duration,
          error: error.message,
        });
        throw error;
      } else if (error instanceof ConnectorOAuthRequestError) {
        _logger.error("OAuth request failed", {
          statusCode: error.statusCode,
          durationMs: duration,
          responseBody: error.responseBody,
        });
        throw error;
      } else {
        _logger.error("Unexpected error during token refresh", {
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
      this._logger.error("Failed to clear authentication data", {
        error: error instanceof Error ? error.message : String(error),
      });
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
