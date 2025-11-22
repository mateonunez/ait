import { ConnectorSlack } from "../../infrastructure/vendors/slack/connector.slack";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import {
  connectorEntityConfigs,
  SLACK_ENTITY_TYPES_ENUM,
  type SlackServiceEntityMap,
} from "./connector.vendors.config";
import { getConnectorConfig } from "../connector.service.config";
import type { SlackMessageEntity, SlackMessageExternal, PaginatedResponse, PaginationParams } from "@ait/core";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";

export interface IConnectorSlackService extends ConnectorServiceBase<ConnectorSlack, SlackServiceEntityMap> {
  fetchMessages(): Promise<SlackMessageEntity[]>;
  getMessagesPaginated(params: PaginationParams): Promise<PaginatedResponse<SlackMessageEntity>>;
}

export class ConnectorSlackService
  extends ConnectorServiceBase<ConnectorSlack, SlackServiceEntityMap>
  implements IConnectorSlackService
{
  constructor() {
    super(getConnectorConfig("slack"));

    this.registerPaginatedEntityConfig<SLACK_ENTITY_TYPES_ENUM.MESSAGE, SlackMessageExternal>(
      SLACK_ENTITY_TYPES_ENUM.MESSAGE,
      connectorEntityConfigs.slack[SLACK_ENTITY_TYPES_ENUM.MESSAGE],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorSlack {
    return new ConnectorSlack(oauth);
  }

  async fetchMessages(): Promise<SlackMessageEntity[]> {
    return this.fetchEntities(SLACK_ENTITY_TYPES_ENUM.MESSAGE, true);
  }

  async getMessagesPaginated(params: PaginationParams): Promise<PaginatedResponse<SlackMessageEntity>> {
    return this.connector.repository.message.getMessagesPaginated(params);
  }
}
