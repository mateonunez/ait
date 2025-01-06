import { AIT } from "../shared/constants/ait.constant";
import type { IConnector } from "./connector.interface";

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
    const authenticatedData = await this.getAuthenticatedData();

    if (authenticatedData) {
      this._dataSource = this.createDataSource(authenticatedData.accessToken);
    } else {
      const response = await this.authenticate(code);
      this._dataSource = this.createDataSource(response.access_token);
      await this.saveAuthenticatedData(response);
    }
  }

  protected abstract getAuthenticatedData(): Promise<any>;
  protected abstract authenticate(code: string): Promise<{ access_token: string }>;
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
