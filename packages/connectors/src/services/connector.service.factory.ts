import type { ConnectorServiceConstructor, ConnectorType } from "@/types/infrastructure/connector.interface";
import type { ConnectorServiceBase } from "./connector.service.base.abstract";
import { ConnectorGitHubService } from "./vendors/connector.github.service";
import { ConnectorSpotifyService } from "./vendors/connector.spotify.service";
import { ConnectorXService } from "./vendors/connector.x.service";

export const connectorServices: Record<ConnectorType, ConnectorServiceConstructor<ConnectorServiceBase<any, any>>> = {
  github: ConnectorGitHubService,
  spotify: ConnectorSpotifyService,
  x: ConnectorXService,
};

export class ConnectorServiceFactory {
  private services = new Map<ConnectorType, ConnectorServiceBase<any, any>>();

  getService<T extends ConnectorServiceBase<any, any>>(connectorType: ConnectorType): T {
    if (!this.services.has(connectorType)) {
      const ConnectorServiceClass = connectorServices[connectorType] as ConnectorServiceConstructor<T>;
      if (!ConnectorServiceClass) {
        throw new Error(`Unknown connector type: ${connectorType}`);
      }
      this.services.set(connectorType, new ConnectorServiceClass());
    }
    return this.services.get(connectorType) as T;
  }
}

export const connectorServiceFactory = new ConnectorServiceFactory();
