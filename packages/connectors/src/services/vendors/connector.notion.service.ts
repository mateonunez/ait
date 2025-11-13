import { ConnectorNotion } from "../../infrastructure/vendors/notion/connector.notion";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import {
  connectorEntityConfigs,
  NOTION_ENTITY_TYPES_ENUM,
  type NotionServiceEntityMap,
} from "./connector.vendors.config";
import { getConnectorConfig } from "../connector.service.config";
import type { NotionPageEntity, NotionPageExternal } from "@ait/core";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";

export class ConnectorNotionService extends ConnectorServiceBase<ConnectorNotion, NotionServiceEntityMap> {
  constructor() {
    super(getConnectorConfig("notion"));

    this.registerEntityConfig<NOTION_ENTITY_TYPES_ENUM.PAGE, NotionPageExternal>(
      NOTION_ENTITY_TYPES_ENUM.PAGE,
      connectorEntityConfigs.notion[NOTION_ENTITY_TYPES_ENUM.PAGE],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorNotion {
    return new ConnectorNotion(oauth);
  }

  async getPages(): Promise<NotionPageEntity[]> {
    return this.fetchEntities(NOTION_ENTITY_TYPES_ENUM.PAGE, true);
  }
}
