import { AItError } from "@ait/core";
import { X_ENTITY_TYPES_ENUM } from "../../../services/vendors/connector.vendors.config";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import type {
  IConnectorXRepository,
  XEntity,
} from "../../../types/domain/entities/vendors/connector.x.repository.types";
import type { IConnectorStore } from "../../../types/shared/store/connector.store.interface";
import type { OAuthTokenDataTarget } from "@ait/postgres";

export class ConnectorXStore implements IConnectorStore {
  private _connectorXRepository: IConnectorXRepository;

  constructor(connectorXRepository: IConnectorXRepository) {
    this._connectorXRepository = connectorXRepository;
  }

  async save<T extends XEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.__type) {
        case X_ENTITY_TYPES_ENUM.TWEET:
          await this._connectorXRepository.tweet.saveTweet(item);
          break;
        default:
          throw new AItError("STORE_UNSUPPORTED_TYPE", `Type ${item.__type} is not supported`);
      }
    }
  }

  async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await this._connectorXRepository.saveAuthenticationData(data);
  }

  async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return this._connectorXRepository.getAuthenticationData();
  }

  private _resolveItems<T extends XEntity>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
