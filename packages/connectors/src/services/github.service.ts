import dotenv from "dotenv";
import { ConnectorGitHubConnector } from "../infrastructure/github/connector.github";
import { ConnectorOAuth } from "../shared/auth/lib/oauth/connector.oauth";

dotenv.config();

export class GitHubService {
  private connector: ConnectorGitHubConnector;

  constructor() {
    const oauth = new ConnectorOAuth({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      endpoint: process.env.GITHUB_ENDPOINT!,
      redirectUri: process.env.GITHUB_REDIRECT_URI!,
    });

    this.connector = new ConnectorGitHubConnector(oauth);
  }

  async authenticate(code: string): Promise<void> {
    await this.connector.connect(code);
  }

  async getRepositories(): Promise<any[]> {
    return this.connector.retriever?.fetchRepositories() || [];
  }
}
