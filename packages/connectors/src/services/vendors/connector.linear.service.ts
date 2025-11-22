import { ConnectorLinear } from "../../infrastructure/vendors/linear/connector.linear";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import {
  connectorEntityConfigs,
  LINEAR_ENTITY_TYPES_ENUM,
  type LinearServiceEntityMap,
} from "./connector.vendors.config";
import { getConnectorConfig } from "../connector.service.config";
import type { LinearIssueEntity, LinearIssueExternal, PaginatedResponse, PaginationParams } from "@ait/core";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";

export interface IConnectorLinearService extends ConnectorServiceBase<ConnectorLinear, LinearServiceEntityMap> {
  fetchIssues(): Promise<LinearIssueEntity[]>;
  getIssuesPaginated(params: PaginationParams): Promise<PaginatedResponse<LinearIssueEntity>>;
}

export class ConnectorLinearService
  extends ConnectorServiceBase<ConnectorLinear, LinearServiceEntityMap>
  implements IConnectorLinearService
{
  constructor() {
    super(getConnectorConfig("linear"));

    this.registerPaginatedEntityConfig<LINEAR_ENTITY_TYPES_ENUM.ISSUE, LinearIssueExternal>(
      LINEAR_ENTITY_TYPES_ENUM.ISSUE,
      connectorEntityConfigs.linear[LINEAR_ENTITY_TYPES_ENUM.ISSUE],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorLinear {
    return new ConnectorLinear(oauth);
  }

  async fetchIssues(): Promise<LinearIssueEntity[]> {
    return this.fetchEntities(LINEAR_ENTITY_TYPES_ENUM.ISSUE, true);
  }

  async getIssuesPaginated(params: PaginationParams): Promise<PaginatedResponse<LinearIssueEntity>> {
    return this.connector.repository.issue.getIssuesPaginated(params);
  }
}
