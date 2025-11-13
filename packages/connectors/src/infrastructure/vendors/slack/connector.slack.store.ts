import type { SlackEntity } from "@ait/core";
import { AItError } from "@ait/core";
import type { IConnectorSlackRepository } from "../../../types/domain/entities/vendors/connector.slack.types";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorStore } from "../../../types/shared/store/connector.store.interface";
import { SLACK_ENTITY_TYPES_ENUM } from "../../../services/vendors/connector.vendors.config";

export class ConnectorSlackStore implements IConnectorStore {
  private _connectorSlackRepository: IConnectorSlackRepository;

  constructor(connectorSlackRepository: IConnectorSlackRepository) {
    this._connectorSlackRepository = connectorSlackRepository;
  }

  async save<T extends SlackEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.__type) {
        case SLACK_ENTITY_TYPES_ENUM.MESSAGE:
          await this._connectorSlackRepository.message.saveMessage(item, { incremental: false });
          break;
        default:
          // @ts-ignore: Unreachable code error
          throw new AItError("STORE_UNSUPPORTED_TYPE", `Type ${item.__type} is not supported`);
      }
    }
  }

  async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await this._connectorSlackRepository.saveAuthenticationData(data);
  }

  async getAuthenticationData(): Promise<any> {
    return this._connectorSlackRepository.getAuthenticationData();
  }

  private _resolveItems<T extends SlackEntity>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
