import type { LinearEntityType, LinearIssueEntity } from "@ait/core";
import { AItError } from "@ait/core";
import { LINEAR_ENTITY_TYPES_ENUM } from "../../../services/vendors/connector.vendors.config";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorLinearRepository } from "../../../types/domain/entities/vendors/connector.linear.types";
import type { IConnectorStore } from "../../../types/shared/store/connector.store.interface";

export class ConnectorLinearStore implements IConnectorStore {
  private _connectorLinearRepository: IConnectorLinearRepository;

  constructor(connectorLinearRepository: IConnectorLinearRepository) {
    this._connectorLinearRepository = connectorLinearRepository;
  }

  async save<T extends LinearEntityType>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.__type) {
        case LINEAR_ENTITY_TYPES_ENUM.ISSUE:
          await this._connectorLinearRepository.issue.saveIssue(item as unknown as LinearIssueEntity, {
            incremental: false,
          });
          break;
        default:
          // @ts-ignore: Unreachable code error
          throw new AItError("STORE_UNSUPPORTED_TYPE", `Type ${item.__type} is not supported`);
      }
    }
  }

  async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await this._connectorLinearRepository.saveAuthenticationData(data);
  }

  async getAuthenticationData(): Promise<any> {
    return this._connectorLinearRepository.getAuthenticationData();
  }

  private _resolveItems<T extends LinearEntityType>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
