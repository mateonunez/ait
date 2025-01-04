import type { GitHubEntity } from "../../../domain/entities/github/connector.github.entities";
import type { IConnectorGitHubRepositoryRepository } from "../../../domain/entities/github/connector.github.repository.interface";
import type { IConnectorStore } from "../../../shared/store/connector.store.interface";

export class ConnectorGitHubStore implements IConnectorStore {
  private _connectorGitHubRepository: IConnectorGitHubRepositoryRepository;

  constructor(connectorGitHubRepository: IConnectorGitHubRepositoryRepository) {
    this._connectorGitHubRepository = connectorGitHubRepository;
  }

  async save<T extends GitHubEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.type) {
        case "repository":
          await this._connectorGitHubRepository.saveRepository(item);
          break;
        default:
          throw new Error(`Type ${item.type} is not supported`);
      }
    }
  }

  private _resolveItems<T extends GitHubEntity>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
