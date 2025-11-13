import type { ConnectorServiceConstructor, ConnectorType } from "../types/infrastructure/connector.interface";
import { AItError } from "@ait/core";
import type { ConnectorServiceBase } from "./connector.service.base.abstract";
import { ConnectorGitHubService } from "./vendors/connector.github.service";
import { ConnectorLinearService } from "./vendors/connector.linear.service";
import { ConnectorSpotifyService } from "./vendors/connector.spotify.service";
import { ConnectorXService } from "./vendors/connector.x.service";
import { ConnectorNotionService } from "./vendors/connector.notion.service";

export const connectorServices: Record<ConnectorType, ConnectorServiceConstructor<ConnectorServiceBase<any, any>>> = {
  github: ConnectorGitHubService,
  linear: ConnectorLinearService,
  spotify: ConnectorSpotifyService,
  x: ConnectorXService,
  notion: ConnectorNotionService,
};

export class ConnectorServiceFactory {
  private services = new Map<ConnectorType, ConnectorServiceBase<any, any>>();

  getService<T extends ConnectorServiceBase<any, any>>(connectorType: ConnectorType): T {
    if (!this.services.has(connectorType)) {
      const ConnectorServiceClass = connectorServices[connectorType] as ConnectorServiceConstructor<T>;
      if (!ConnectorServiceClass) {
        throw new AItError("CONNECTOR_UNKNOWN", `Unknown connector type: ${connectorType}`);
      }
      this.services.set(connectorType, new ConnectorServiceClass());
    }
    return this.services.get(connectorType) as T;
  }
}

export const connectorServiceFactory = new ConnectorServiceFactory();
