import dotenv from "dotenv";
import { ConnectorGitHub } from "../../infrastructure/github/connector.github";
import { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorService } from "../connector.service.interface";
import type { IConnectorGitHubService } from "./connector.github.service.interface";
import type { GitHubRepositoryEntity } from "../../domain/entities/github/connector.github.entities";
import { connectorGithubMapper } from "../../domain/mappers/github/connector.github.mapper";

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

  async getRepositories(): Promise<GitHubRepositoryEntity[]> {
    await this._connector.connect(); // <- Required, always.

    const repositories = await this._connector.dataSource?.fetchRepositories();
    if (!repositories?.length) {
      return [];
    }

    return repositories.map((repository) => connectorGithubMapper.externalToDomain(repository));
  }

  get connector(): ConnectorGitHub {
    return this._connector;
  }

  set connector(connector: ConnectorGitHub) {
    this._connector = connector;
  }
}
