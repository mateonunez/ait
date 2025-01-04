import { ConnectorGitHubAuthenticator } from "./authenticator/connector.github.authenticator";
import { ConnectorGitHubDataSource } from "./data-source/connector.github.data-source";
import { ConnectorGitHubStore } from "./store/connector.github.store";
import type { IConnector } from "../connector.interface";
import type { IConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth.interface";
import type { IConnectorGitHubDataSource } from "./data-source/connector.github.data-source.interface";
import type { IConnectorGitHubRepository } from "../../domain/entities/github/connector.github.repository.interface";
import { ConnectorGitHubRepository } from "../../domain/entities/github/connector.github.repository";

export class ConnectorGitHub
  implements IConnector<ConnectorGitHubAuthenticator, IConnectorGitHubDataSource, ConnectorGitHubStore>
{
  private _authenticator: ConnectorGitHubAuthenticator;
  private _dataSource?: IConnectorGitHubDataSource;
  private _store: ConnectorGitHubStore;
  private _repository: IConnectorGitHubRepository;

  constructor(oauth: IConnectorOAuth) {
    this._authenticator = new ConnectorGitHubAuthenticator(oauth);
    this._repository = new ConnectorGitHubRepository();
    this._store = new ConnectorGitHubStore(this._repository);
  }

  async connect(code: string): Promise<void> {
    const { access_token: accessToken } = await this._authenticator.authenticate(code);

    this._dataSource = new ConnectorGitHubDataSource(accessToken);
  }

  get authenticator(): ConnectorGitHubAuthenticator {
    return this._authenticator;
  }

  set authenticator(authenticator: ConnectorGitHubAuthenticator) {
    this._authenticator = authenticator;
  }

  get dataSource(): IConnectorGitHubDataSource | undefined {
    return this._dataSource;
  }

  set dataSource(dataSource: IConnectorGitHubDataSource | undefined) {
    this._dataSource = dataSource;
  }

  get store(): ConnectorGitHubStore {
    return this._store;
  }

  set store(store: ConnectorGitHubStore) {
    this._store = store;
  }
}
