import type { PaginatedResponse, PaginationParams, SlackMessageEntity, SlackMessageExternal } from "@ait/core";
import { ConnectorSlack } from "../../infrastructure/vendors/slack/connector.slack";
import type { ConnectorOAuth, IConnectorOAuthConfig } from "../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { getConnectorConfig } from "../connector.service.config";
import {
  SLACK_ENTITY_TYPES_ENUM,
  type SlackServiceEntityMap,
  connectorEntityConfigs,
} from "./connector.vendors.config";

export interface IConnectorSlackService extends ConnectorServiceBase<ConnectorSlack, SlackServiceEntityMap> {
  fetchMessages(): Promise<SlackMessageEntity[]>;
  getMessagesPaginated(params: PaginationParams): Promise<PaginatedResponse<SlackMessageEntity>>;
}

export class ConnectorSlackService
  extends ConnectorServiceBase<ConnectorSlack, SlackServiceEntityMap>
  implements IConnectorSlackService
{
  constructor(config?: IConnectorOAuthConfig) {
    super(config ?? getConnectorConfig("slack"));

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
