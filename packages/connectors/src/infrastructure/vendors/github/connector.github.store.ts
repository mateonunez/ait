import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import { AItError } from "@ait/core";
import type { IConnectorStore } from "../../../types/shared/store/connector.store.interface";
import type { IConnectorGitHubRepository } from "../../../types/domain/entities/vendors/connector.github.repository.types";
import type { GitHubEntity } from "@ait/core";
import type { OAuthTokenDataTarget } from "@ait/postgres";
import { GITHUB_ENTITY_TYPES_ENUM } from "../../../services/vendors/connector.vendors.config";

export class ConnectorGitHubStore implements IConnectorStore {
  private _connectorGitHubRepository: IConnectorGitHubRepository;

  constructor(connectorGitHubRepository: IConnectorGitHubRepository) {
    this._connectorGitHubRepository = connectorGitHubRepository;
  }

  async save<T extends GitHubEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.__type) {
        case GITHUB_ENTITY_TYPES_ENUM.REPOSITORY:
          await this._connectorGitHubRepository.repo.saveRepository(item, { incremental: false });
          break;
        case GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST:
          await this._connectorGitHubRepository.pullRequest.savePullRequest(item, { incremental: false });
          break;
        default:
          throw new AItError("STORE_UNSUPPORTED_TYPE", `Type ${item.__type} is not supported`);
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
