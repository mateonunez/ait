import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { GitHubEntity } from "../../../domain/entities/github/connector.github.entities";
import type { IConnectorGitHubRepository } from "../../../domain/entities/github/connector.github.repository.interface";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth.interface";
import type { IConnectorStore } from "../../../shared/store/connector.store.interface";

export class ConnectorGitHubStore implements IConnectorStore {
  private _connectorGitHubRepository: IConnectorGitHubRepository;

  constructor(connectorGitHubRepository: IConnectorGitHubRepository) {
    this._connectorGitHubRepository = connectorGitHubRepository;
  }

  async save<T extends GitHubEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.type) {
        case "repository":
          await this._connectorGitHubRepository.repo.saveRepository(item);
          break;
        default:
          throw new Error(`Type ${item.type} is not supported`);
      }
    }
  }

  async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await this._connectorGitHubRepository.saveAuthenticationData(data);
  }

  async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return this._connectorGitHubRepository.getAuthenticationData();
  }

  private _resolveItems<T extends GitHubEntity>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
