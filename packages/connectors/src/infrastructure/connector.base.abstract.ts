import type { OAuthTokenDataTarget } from "@ait/postgres";
import { AIT } from "../shared/constants/ait.constant";
import type { IConnector } from "../types/infrastructure/connector.interface";

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

  constructor(authenticator: AuthenticatorType, repository: RepositoryType, store: StoreType) {
    this._authenticator = authenticator;
    this._repository = repository;
    this._store = store;
  }

  public async connect(code = AIT): Promise<void> {
    console.info("[Connector] Connecting...");
    const authenticatedData = await this.getAuthenticatedData();

    if (!authenticatedData) {
      console.info("[Connector] No authenticated data found. Starting authentication...");
      await this._handleAuthentication(code);
      return;
    }

    await this._handleExistingAuthentication(authenticatedData);
  }

  private async _handleAuthentication(code: string): Promise<void> {
    console.info("[Connector] Handling authentication...");
    const response = await this.authenticate(code);
    console.debug("response", response);
    await this._updateDataSourceAndSaveAuth(response);
    console.info("[Connector] Authentication completed");
  }

  private async _handleExistingAuthentication(authenticatedData: any): Promise<void> {
    if (this._isTokenExpired(authenticatedData)) {
      console.info("[Connector] Token expired. Refreshing...");
      await this._handleTokenRefresh(authenticatedData);
      return;
    }

    console.info("[Connector] Using existing authentication");
    this._dataSource = this.createDataSource(authenticatedData.accessToken);
  }

  private async _handleTokenRefresh(authenticatedData: OAuthTokenDataTarget): Promise<void> {
    if (!authenticatedData.refreshToken) {
      console.info("[Connector] No refresh token found. Starting new authentication...");
      await this._handleAuthentication(AIT);
      return;
    }

    console.info("[Connector] Refreshing token...");
    const response = await this.refreshToken(authenticatedData.refreshToken);
    console.warn("response", response);
    await this._updateDataSourceAndSaveAuth(response);
    console.info("[Connector] Token refresh completed");
  }

  private async _updateDataSourceAndSaveAuth(response: any): Promise<void> {
    console.info("[Connector] Updating data source and saving auth data...");
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

  protected abstract getAuthenticatedData(): Promise<any>;
  protected abstract authenticate(code: string): Promise<{ access_token: string }>;
  protected abstract refreshToken(refreshToken: string): Promise<{ access_token: string }>;
  protected abstract createDataSource(accessToken: string): DataSourceType;
  protected abstract saveAuthenticatedData(response: { access_token: string }): Promise<void>;

  get authenticator(): AuthenticatorType {
    return this._authenticator;
  }
  set authenticator(authenticator: AuthenticatorType) {
    this._authenticator = authenticator;
  }

  get dataSource(): DataSourceType | undefined {
    return this._dataSource;
  }
  set dataSource(ds: DataSourceType | undefined) {
    this._dataSource = ds;
  }

  get store(): StoreType {
    return this._store;
  }
  set store(store: StoreType) {
    this._store = store;
  }
}
