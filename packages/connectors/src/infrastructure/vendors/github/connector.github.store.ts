import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import type { IConnectorStore } from "@/types/shared/store/connector.store.interface";
import type {
  GitHubEntity,
  IConnectorGitHubRepository,
} from "@/types/domain/entities/vendors/connector.github.repository.types";
import type { OAuthTokenDataTarget } from "@ait/postgres";

export class ConnectorGitHubStore implements IConnectorStore {
  private _connectorGitHubRepository: IConnectorGitHubRepository;

  constructor(connectorGitHubRepository: IConnectorGitHubRepository) {
    this._connectorGitHubRepository = connectorGitHubRepository;
  }

  async save<T extends GitHubEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.__type) {
        case "repository":
          await this._connectorGitHubRepository.repo.saveRepository(item);
          break;
        default:
          throw new Error(`Type ${item.__type} is not supported`);
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
