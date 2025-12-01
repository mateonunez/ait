import type { PaginatedResponse, PaginationParams, XTweetEntity, XTweetExternal } from "@ait/core";
import { ConnectorX } from "../../infrastructure/vendors/x/connector.x";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { getConnectorConfig } from "../connector.service.config";
import { type XServiceEntityMap, X_ENTITY_TYPES_ENUM, connectorEntityConfigs } from "./connector.vendors.config";

export interface IConnectorXService extends ConnectorServiceBase<ConnectorX, XServiceEntityMap> {
  fetchTweets(): Promise<XTweetEntity[]>;
  getTweetsPaginated(params: PaginationParams): Promise<PaginatedResponse<XTweetEntity>>;
}

export class ConnectorXService
  extends ConnectorServiceBase<ConnectorX, XServiceEntityMap>
  implements IConnectorXService
{
  constructor() {
    super(getConnectorConfig("x"));

    this.registerPaginatedEntityConfig<X_ENTITY_TYPES_ENUM.TWEET, XTweetExternal>(
      X_ENTITY_TYPES_ENUM.TWEET,
      connectorEntityConfigs.x[X_ENTITY_TYPES_ENUM.TWEET],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorX {
    return new ConnectorX(oauth);
  }

  async fetchTweets(): Promise<XTweetEntity[]> {
    await this.connector.connect();
    return this.fetchEntities(X_ENTITY_TYPES_ENUM.TWEET);
  }

  async getTweetsPaginated(params: PaginationParams): Promise<PaginatedResponse<XTweetEntity>> {
    return this.connector.repository.tweet.getTweetsPaginated(params);
  }
}
