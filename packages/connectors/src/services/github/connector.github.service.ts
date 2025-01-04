import dotenv from "dotenv";
import { ConnectorGitHub } from "../../infrastructure/github/connector.github";
import { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorService } from "../connector.service.interface";
import type { IConnectorGitHubService } from "./connector.github.service.interface";
import type { ConnectorGitHubFetchRepositoriesResponse } from "../../infrastructure/github/data-source/connector.github.data-source.interface";
import type { NormalizedGitHubRepository } from "../../infrastructure/github/normalizer/connector.github.normalizer.interface";

dotenv.config();

export class ConnectorGitHubService implements IConnectorService<ConnectorGitHub>, IConnectorGitHubService {
  private _connector: ConnectorGitHub;

  constructor() {
    const oauth = new ConnectorOAuth({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      endpoint: process.env.GITHUB_ENDPOINT!,
      redirectUri: process.env.GITHUB_REDIRECT_URI!,
    });

    this._connector = new ConnectorGitHub(oauth);
  }

  async authenticate(code: string): Promise<void> {
    await this._connector.connect(code);
  }

  async getRepositories(): Promise<NormalizedGitHubRepository[]> {
    const repositories = await this._connector.dataSource?.fetchRepositories();
    const normalizedRepositories =
      repositories?.map((repository) => this._connector.normalizer.normalize(repository)) || [];

    return normalizedRepositories;
  }

  get connector(): ConnectorGitHub {
    return this._connector;
  }

  set connector(connector: ConnectorGitHub) {
    this._connector = connector;
  }
}
