import { ConnectorX } from "../../infrastructure/vendors/x/connector.x";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { connectorEntityConfigs, X_ENTITY_TYPES_ENUM, type XServiceEntityMap } from "./connector.vendors.config";
import { getConnectorConfig } from "../connector.service.config";
import type { XTweetEntity, XTweetExternal } from "../../types/domain/entities/vendors/connector.x.repository.types";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";

export class ConnectorXService extends ConnectorServiceBase<ConnectorX, XServiceEntityMap> {
  constructor() {
    super(getConnectorConfig("x"));

    this.registerEntityConfig<X_ENTITY_TYPES_ENUM.TWEET, XTweetExternal>(
      X_ENTITY_TYPES_ENUM.TWEET,
      connectorEntityConfigs.x[X_ENTITY_TYPES_ENUM.TWEET],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorX {
    return new ConnectorX(oauth);
  }

  async getTweets(): Promise<XTweetEntity[]> {
    await this.connector.connect();
    return this.fetchEntities(X_ENTITY_TYPES_ENUM.TWEET);
  }
}
