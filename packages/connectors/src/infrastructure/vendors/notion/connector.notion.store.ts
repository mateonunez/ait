import type { NotionEntity } from "@ait/core";
import { AItError } from "@ait/core";
import { NOTION_ENTITY_TYPES_ENUM } from "../../../services/vendors/connector.vendors.config";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorNotionRepository } from "../../../types/domain/entities/vendors/connector.notion.types";
import type { IConnectorStore } from "../../../types/shared/store/connector.store.interface";

export class ConnectorNotionStore implements IConnectorStore {
  private _connectorNotionRepository: IConnectorNotionRepository;

  constructor(connectorNotionRepository: IConnectorNotionRepository) {
    this._connectorNotionRepository = connectorNotionRepository;
  }

  async save<T extends NotionEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.__type) {
        case NOTION_ENTITY_TYPES_ENUM.PAGE:
          await this._connectorNotionRepository.page.savePage(item, { incremental: false });
          break;
        default:
          // @ts-ignore: Unreachable code error
          throw new AItError("STORE_UNSUPPORTED_TYPE", `Type ${item.__type} is not supported`);
      }
    }
  }

  async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await this._connectorNotionRepository.saveAuthenticationData(data);
  }

  async getAuthenticationData(): Promise<any> {
    return this._connectorNotionRepository.getAuthenticationData();
  }

  private _resolveItems<T extends NotionEntity>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
