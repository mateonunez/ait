import type { LinearEntity } from "@/types/domain/entities/vendors/connector.linear.types";
import type { IConnectorLinearRepository } from "@/types/domain/entities/vendors/connector.linear.types";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import type { IConnectorStore } from "@/types/shared/store/connector.store.interface";
import { LINEAR_ENTITY_TYPES_ENUM } from "@/services/vendors/connector.vendors.config";

export class ConnectorLinearStore implements IConnectorStore {
  private _connectorLinearRepository: IConnectorLinearRepository;

  constructor(connectorLinearRepository: IConnectorLinearRepository) {
    this._connectorLinearRepository = connectorLinearRepository;
  }

  async save<T extends LinearEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.__type) {
        case LINEAR_ENTITY_TYPES_ENUM.ISSUE:
          await this._connectorLinearRepository.issue.saveIssue(item, { incremental: true });
          break;
        default:
          // @ts-ignore: Unreachable code error
          throw new Error(`Type ${item.__type} is not supported`);
      }
    }
  }

  async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await this._connectorLinearRepository.saveAuthenticationData(data);
  }

  async getAuthenticationData(): Promise<any> {
    return this._connectorLinearRepository.getAuthenticationData();
  }

  private _resolveItems<T extends LinearEntity>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
