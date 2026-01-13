import { type Logger, getLogger } from "@ait/core";
import { and, connectorConfigs, eq, getPostgresClient } from "@ait/postgres";
import { connectorServiceFactory } from "./connector.service.factory";
import type { ConnectorGitHubService } from "./vendors/connector.github.service";
import type { ConnectorGoogleService } from "./vendors/connector.google.service";
import type { ConnectorLinearService } from "./vendors/connector.linear.service";
import type { ConnectorNotionService } from "./vendors/connector.notion.service";
import type { ConnectorSlackService } from "./vendors/connector.slack.service";
import type { ConnectorSpotifyService } from "./vendors/connector.spotify.service";
import type { ConnectorXService } from "./vendors/connector.x.service";

export interface UserConnectorServices {
  spotify?: ConnectorSpotifyService;
  notion?: ConnectorNotionService;
  github?: ConnectorGitHubService;
  linear?: ConnectorLinearService;
  slack?: ConnectorSlackService;
  google?: ConnectorGoogleService;
  x?: ConnectorXService;
}

interface CacheEntry {
  services: UserConnectorServices;
  timestamp: number;
}

export interface IUserConnectorManager {
  getServices(userId: string): Promise<UserConnectorServices>;
  clearCache(userId?: string): void;
}

/**
 * Manages user-specific connector service loading with caching.
 *
 * This service encapsulates the logic for loading connector services
 * from the database based on user configuration, with TTL-based caching
 * to avoid repeated database lookups on every request.
 */
export class UserConnectorManager implements IUserConnectorManager {
  private _cache: Map<string, CacheEntry> = new Map();
  private _cacheTtlMs: number;
  private _logger: Logger;

  constructor(cacheTtlMs = 5 * 60 * 1000) {
    this._cacheTtlMs = cacheTtlMs;
    this._logger = getLogger();
  }

  /**
   * Get connector services for a user.
   * Returns cached services if available and not expired.
   */
  async getServices(userId: string): Promise<UserConnectorServices> {
    const cached = this._cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this._cacheTtlMs) {
      return cached.services;
    }

    const services = await this._loadServicesFromDb(userId);
    this._cache.set(userId, { services, timestamp: Date.now() });

    return services;
  }

  /**
   * Clear the cache for a specific user or all users.
   */
  clearCache(userId?: string): void {
    if (userId) {
      this._cache.delete(userId);
    } else {
      this._cache.clear();
    }
  }

  private async _loadServicesFromDb(userId: string): Promise<UserConnectorServices> {
    const services: UserConnectorServices = {};

    try {
      const { db } = getPostgresClient();
      const configs = await db.query.connectorConfigs.findMany({
        where: and(eq(connectorConfigs.userId, userId), eq(connectorConfigs.isEnabled, true)),
        with: { provider: true },
      });

      for (const config of configs) {
        const providerSlug = (config as { provider: { slug: string } }).provider.slug;
        await this._loadServiceForProvider(services, providerSlug, config.id, userId);
      }
    } catch (err) {
      this._logger.warn("[UserConnectorManager] Failed to load connector configs", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return services;
  }

  private async _loadServiceForProvider(
    services: UserConnectorServices,
    providerSlug: string,
    configId: string,
    userId: string,
  ): Promise<void> {
    try {
      switch (providerSlug) {
        case "spotify":
          services.spotify = await connectorServiceFactory.getServiceByConfig<ConnectorSpotifyService>(
            configId,
            userId,
          );
          break;
        case "notion":
          services.notion = await connectorServiceFactory.getServiceByConfig<ConnectorNotionService>(configId, userId);
          break;
        case "github":
          services.github = await connectorServiceFactory.getServiceByConfig<ConnectorGitHubService>(configId, userId);
          break;
        case "linear":
          services.linear = await connectorServiceFactory.getServiceByConfig<ConnectorLinearService>(configId, userId);
          break;
        case "slack":
          services.slack = await connectorServiceFactory.getServiceByConfig<ConnectorSlackService>(configId, userId);
          break;
        case "google":
          services.google = await connectorServiceFactory.getServiceByConfig<ConnectorGoogleService>(configId, userId);
          break;
        case "x":
          services.x = await connectorServiceFactory.getServiceByConfig<ConnectorXService>(configId, userId);
          break;
      }
    } catch (err) {
      this._logger.debug(`[UserConnectorManager] Failed to load ${providerSlug} for user`, {
        userId,
        configId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// Singleton instance
let userConnectorManagerInstance: UserConnectorManager | null = null;

export function getUserConnectorManager(): UserConnectorManager {
  if (!userConnectorManagerInstance) {
    userConnectorManagerInstance = new UserConnectorManager();
  }
  return userConnectorManagerInstance;
}
