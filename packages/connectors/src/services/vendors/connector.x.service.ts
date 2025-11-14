import { ConnectorX } from "../../infrastructure/vendors/x/connector.x";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { connectorEntityConfigs, X_ENTITY_TYPES_ENUM, type XServiceEntityMap } from "./connector.vendors.config";
import { getConnectorConfig } from "../connector.service.config";
import type { XTweetEntity, XTweetExternal, PaginatedResponse, PaginationParams } from "@ait/core";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";

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

    this.registerEntityConfig<X_ENTITY_TYPES_ENUM.TWEET, XTweetExternal>(
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
