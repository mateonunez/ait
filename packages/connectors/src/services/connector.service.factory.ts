import type { ConnectorServiceBase } from "./connector.service.base.abstract";
import { ConnectorGitHubService } from "./vendors/connector.github.service";
import { ConnectorSpotifyService } from "./vendors/connector.spotify.service";

export type ConnectorType = "github" | "spotify";

type ServiceConstructor<T extends ConnectorServiceBase<any, any>> = new () => T;

const connectorServices: Record<ConnectorType, ServiceConstructor<ConnectorServiceBase<any, any>>> = {
  github: ConnectorGitHubService,
  spotify: ConnectorSpotifyService,
};

export class ConnectorServiceFactory {
  private services = new Map<ConnectorType, ConnectorServiceBase<any, any>>();

  getService<T extends ConnectorServiceBase<any, any>>(type: ConnectorType): T {
    if (!this.services.has(type)) {
      const ServiceClass = connectorServices[type] as ServiceConstructor<T>;
      if (!ServiceClass) {
        throw new Error(`Unknown connector type: ${type}`);
      }
      this.services.set(type, new ServiceClass());
    }
    return this.services.get(type) as T;
  }
}

export const connectorServiceFactory = new ConnectorServiceFactory();
