import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorGitHubAuthenticator } from "./authenticator/connector.github.authenticator";
import { ConnectorGitHubNormalizer } from "./normalizer/connector.github.normalizer";
import { ConnectorGitHubDataSource } from "./data-source/connector.github.data-source";
import { ConnectorGitHubStore } from "./store/connector.github.store";
import type { GitHubRepository } from "./normalizer/connector.github.normalizer.interface";
import type { IConnector } from "../connector.interface";
import type { IConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth.interface";
import type { IConnectorGitHubDataSource } from "./data-source/connector.github.data-source.interface";

export class ConnectorGitHub
  implements
    IConnector<
      ConnectorGitHubAuthenticator,
      IConnectorGitHubDataSource,
      ConnectorGitHubNormalizer,
      ConnectorGitHubStore
    >
{
  private _authenticator: ConnectorGitHubAuthenticator;
  private _dataSource?: IConnectorGitHubDataSource;
  private _normalizer: ConnectorGitHubNormalizer;
  private _store: ConnectorGitHubStore;

  constructor(oauth: IConnectorOAuth) {
    this._authenticator = new ConnectorGitHubAuthenticator(oauth);
    this._normalizer = new ConnectorGitHubNormalizer();
    this._store = new ConnectorGitHubStore();
  }

  async connect(code: string): Promise<void> {
    const { access_token: accessToken } =
      await this._authenticator.authenticate(code);

    this._dataSource = new ConnectorGitHubDataSource(accessToken);

    const repositories = await this._dataSource.fetchRepositories();
    const normalizedRepos = repositories.map((repo) =>
      this._normalizer.normalize(repo as GitHubRepository)
    );

    await this._store.save(normalizedRepos);
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

  set dataSource(dataSource: ConnectorGitHubDataSource | undefined) {
    this._dataSource = dataSource;
  }

  get normalizer(): ConnectorGitHubNormalizer {
    return this._normalizer;
  }

  set normalizer(normalizer: ConnectorGitHubNormalizer) {
    this._normalizer = normalizer;
  }

  get store(): ConnectorGitHubStore {
    return this._store;
  }

  set store(store: ConnectorGitHubStore) {
    this._store = store;
  }
}
