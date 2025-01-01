import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorGitHubAuthenticator } from "./authenticator/connector.github.authenticator";
import { ConnectorGitHubNormalizer } from "./normalizer/connector.github.normalizer";
import { ConnectorGitHubRetriever } from "./retriever/connector.github.retriever";
import { ConnectorGitHubStore } from "./store/connector.github.store";

export interface IConnector {
  connect(code: string): Promise<void>;
}

export class ConnectorGitHubConnector implements IConnector {
  private _authenticator: ConnectorGitHubAuthenticator;
  private _retriever?: ConnectorGitHubRetriever;
  private _normalizer: ConnectorGitHubNormalizer;
  private _store: ConnectorGitHubStore;

  constructor(oauth: ConnectorOAuth) {
    this._authenticator = new ConnectorGitHubAuthenticator(oauth);
    this._normalizer = new ConnectorGitHubNormalizer();
    this._store = new ConnectorGitHubStore();
  }

  async connect(code: string): Promise<void> {
    const { access_token: accessToken } = await this._authenticator.authenticate(code);

    this._retriever = new ConnectorGitHubRetriever(accessToken);

    const repositories = await this._retriever.fetchRepositories();
    const normalizedRepos = repositories.map((repo) => this._normalizer.normalize(repo));

    await this._store.save(normalizedRepos);
  }

  get retriever(): ConnectorGitHubRetriever | undefined {
    return this._retriever;
  }

  get normalizer(): ConnectorGitHubNormalizer {
    return this.normalizer;
  }
}
