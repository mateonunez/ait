import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorGitHubAuthenticator } from "./authenticator/connector.github.authenticator";
import { ConnectorGitHubNormalizer } from "./normalizer/connector.github.normalizer";
import { ConnectorGitHubRetriever } from "./retriever/connector.github.retriever";
import { ConnectorGitHubStore } from "./store/connector.github.store";

export class ConnectorGitHubConnector {
    private authenticator: ConnectorGitHubAuthenticator;
    private retriever?: ConnectorGitHubRetriever;
    private normalizer: ConnectorGitHubNormalizer;
    private store: ConnectorGitHubStore;

    constructor(oauth: ConnectorOAuth) {
        this.authenticator = new ConnectorGitHubAuthenticator(oauth);
        this.normalizer = new ConnectorGitHubNormalizer();
        this.store = new ConnectorGitHubStore();
    }

    async connect(code: string): Promise<void> {
        const { access_token } = await this.authenticator.authenticate(code);

        this.retriever = new ConnectorGitHubRetriever(access_token);

        const repositories = await this.retriever.fetchRepositories();
        const normalizedRepos = repositories.map(repo => this.normalizer.normalize(repo));

        await this.store.save(normalizedRepos);
    }
}
