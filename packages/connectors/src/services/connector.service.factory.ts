import type { ConnectorServiceBase } from "./connector.service.base.abstract";
import { ConnectorGitHubService } from "./vendors/connector.github.service";
import { ConnectorSpotifyService } from "./vendors/connector.spotify.service";

export type ConnectorType = "github" | "spotify";
type ConnectorServices = Record<ConnectorType, new () => ConnectorServiceBase<any, any>>;

const SERVICES: ConnectorServices = {
  github: ConnectorGitHubService,
  spotify: ConnectorSpotifyService,
} as const;

export class ConnectorServiceFactory {
  private services = new Map<ConnectorType, ConnectorServiceBase<any, any>>();

  getService<T extends ConnectorServiceBase<any, any>>(type: ConnectorType): T {
    if (!this.services.has(type)) {
      const ServiceClass = SERVICES[type];
      if (!ServiceClass) {
        throw new Error(`Unknown connector type: ${type}`);
      }
      this.services.set(type, new ServiceClass());
    }
    return this.services.get(type) as T;
  }
}

export const connectorServiceFactory = new ConnectorServiceFactory();
