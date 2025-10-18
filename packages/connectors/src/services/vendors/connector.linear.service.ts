import { ConnectorLinear } from "@/infrastructure/vendors/linear/connector.linear";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import {
  connectorEntityConfigs,
  LINEAR_ENTITY_TYPES_ENUM,
  type LinearServiceEntityMap,
} from "./connector.vendors.config";
import { getConnectorConfig } from "../connector.service.config";
import type { LinearIssueEntity, LinearIssueExternal } from "@/types/domain/entities/vendors/connector.linear.types";
import type { ConnectorOAuth } from "@/shared/auth/lib/oauth/connector.oauth";

export class ConnectorLinearService extends ConnectorServiceBase<ConnectorLinear, LinearServiceEntityMap> {
  constructor() {
    super(getConnectorConfig("linear"));

    this.registerEntityConfig<LINEAR_ENTITY_TYPES_ENUM.ISSUE, LinearIssueExternal>(
      LINEAR_ENTITY_TYPES_ENUM.ISSUE,
      connectorEntityConfigs.linear[LINEAR_ENTITY_TYPES_ENUM.ISSUE],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorLinear {
    return new ConnectorLinear(oauth);
  }

  async getIssues(): Promise<LinearIssueEntity[]> {
    return this.fetchEntities(LINEAR_ENTITY_TYPES_ENUM.ISSUE);
  }
}
