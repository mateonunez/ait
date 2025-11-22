import { ConnectorNotion } from "../../infrastructure/vendors/notion/connector.notion";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import {
  connectorEntityConfigs,
  NOTION_ENTITY_TYPES_ENUM,
  type NotionServiceEntityMap,
} from "./connector.vendors.config";
import { getConnectorConfig } from "../connector.service.config";
import type { NotionPageEntity, NotionPageExternal, PaginatedResponse, PaginationParams } from "@ait/core";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";

export interface IConnectorNotionService extends ConnectorServiceBase<ConnectorNotion, NotionServiceEntityMap> {
  fetchPages(): Promise<NotionPageEntity[]>;
  getPagesPaginated(params: PaginationParams): Promise<PaginatedResponse<NotionPageEntity>>;
}

export class ConnectorNotionService
  extends ConnectorServiceBase<ConnectorNotion, NotionServiceEntityMap>
  implements IConnectorNotionService
{
  constructor() {
    super(getConnectorConfig("notion"));

    this.registerPaginatedEntityConfig<NOTION_ENTITY_TYPES_ENUM.PAGE, NotionPageExternal>(
      NOTION_ENTITY_TYPES_ENUM.PAGE,
      connectorEntityConfigs.notion[NOTION_ENTITY_TYPES_ENUM.PAGE],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorNotion {
    return new ConnectorNotion(oauth);
  }

  async fetchPages(): Promise<NotionPageEntity[]> {
    return this.fetchEntities(NOTION_ENTITY_TYPES_ENUM.PAGE, true);
  }

  async getPagesPaginated(params: PaginationParams): Promise<PaginatedResponse<NotionPageEntity>> {
    return this.connector.repository.page.getPagesPaginated(params);
  }
}
