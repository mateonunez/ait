import { ConnectorSlack } from "../../infrastructure/vendors/slack/connector.slack";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import {
  connectorEntityConfigs,
  SLACK_ENTITY_TYPES_ENUM,
  type SlackServiceEntityMap,
} from "./connector.vendors.config";
import { getConnectorConfig } from "../connector.service.config";
import type { SlackMessageEntity, SlackMessageExternal } from "@ait/core";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";

export class ConnectorSlackService extends ConnectorServiceBase<ConnectorSlack, SlackServiceEntityMap> {
  constructor() {
    super(getConnectorConfig("slack"));

    this.registerEntityConfig<SLACK_ENTITY_TYPES_ENUM.MESSAGE, SlackMessageExternal>(
      SLACK_ENTITY_TYPES_ENUM.MESSAGE,
      connectorEntityConfigs.slack[SLACK_ENTITY_TYPES_ENUM.MESSAGE],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorSlack {
    return new ConnectorSlack(oauth);
  }

  async getMessages(): Promise<SlackMessageEntity[]> {
    return this.fetchEntities(SLACK_ENTITY_TYPES_ENUM.MESSAGE, true);
  }
}
