import dotenv from "dotenv";
import { ConnectorGitHubConnector } from "../../infrastructure/github/connector.github";
import { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";

dotenv.config();

export class ConnectorGitHubService {
  private _connector: ConnectorGitHubConnector;

  constructor() {
    const oauth = new ConnectorOAuth({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      endpoint: process.env.GITHUB_ENDPOINT!,
      redirectUri: process.env.GITHUB_REDIRECT_URI!,
    });

    this._connector = new ConnectorGitHubConnector(oauth);
  }

  async authenticate(code: string): Promise<void> {
    await this._connector.connect(code);
  }

  async getRepositories(): Promise<any[]> {
    return this._connector.retriever?.fetchRepositories() || [];
  }

  get connector(): ConnectorGitHubConnector {
    return this._connector;
  }

  set connector(connector: ConnectorGitHubConnector) {
    this._connector = connector;
  }
}
