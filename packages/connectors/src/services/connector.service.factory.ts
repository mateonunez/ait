import { AItError, decrypt } from "@ait/core";
import { and, connectorConfigs, eq, getPostgresClient } from "@ait/postgres";
import type { ConnectorServiceConstructor, ConnectorType } from "../types/infrastructure/connector.interface";
import type { ConnectorServiceBase } from "./connector.service.base.abstract";
import { ConnectorGitHubService } from "./vendors/connector.github.service";
import { ConnectorGoogleService } from "./vendors/connector.google.service";
import { ConnectorLinearService } from "./vendors/connector.linear.service";
import { ConnectorNotionService } from "./vendors/connector.notion.service";
import { ConnectorSlackService } from "./vendors/connector.slack.service";
import { ConnectorSpotifyService } from "./vendors/connector.spotify.service";
import { ConnectorXService } from "./vendors/connector.x.service";

export const connectorServices: Record<ConnectorType, ConnectorServiceConstructor<ConnectorServiceBase<any, any>>> = {
  github: ConnectorGitHubService,
  linear: ConnectorLinearService,
  spotify: ConnectorSpotifyService,
  x: ConnectorXService,
  notion: ConnectorNotionService,
  slack: ConnectorSlackService,
  google: ConnectorGoogleService,
  youtube: ConnectorGoogleService,
};

export class ConnectorServiceFactory {
  private services = new Map<string, ConnectorServiceBase<any, any>>();

  /**
   * Returns a connector service instance based on its database configuration ID.
   * This handles decryption of settings automatically.
   */
  async getServiceByConfig<T extends ConnectorServiceBase<any, any>>(configId: string, userId: string): Promise<T> {
    const cacheKey = `${userId}:${configId}`;
    if (this.services.has(cacheKey)) {
      return this.services.get(cacheKey) as T;
    }

    const { db } = getPostgresClient();
    const config = (await db.query.connectorConfigs.findFirst({
      where: and(eq(connectorConfigs.id, configId), eq(connectorConfigs.userId, userId)),
      with: {
        provider: true,
      },
    })) as any;

    if (!config) {
      throw new AItError("CONNECTOR_CONFIG_NOT_FOUND", `Configuration ${configId} not found for user ${userId}`);
    }

    const encryptionKey = process.env.AIT_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new AItError("ENCRYPTION_KEY_MISSING", "AIT_ENCRYPTION_KEY is required for connector configuration");
    }

    if (encryptionKey.length !== 64) {
      throw new AItError("ENCRYPTION_KEY_INVALID", "AIT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
    }

    const decryptedSettingsJson = decrypt(config.encryptedConfig, config.iv, encryptionKey);
    const settings = JSON.parse(decryptedSettingsJson);

    const connectorType = config.provider.slug as ConnectorType;
    const ConnectorServiceClass = connectorServices[connectorType] as ConnectorServiceConstructor<T>;

    if (!ConnectorServiceClass) {
      throw new AItError("CONNECTOR_UNKNOWN", `Unknown connector type: ${connectorType}`);
    }

    // We assume the settings match the expectations of the service's OAuth config
    // We inject the userId and connectorConfigId from the database context
    const serviceConfig = {
      ...settings,
      userId,
      connectorConfigId: configId,
    };

    const service = new ConnectorServiceClass(serviceConfig);
    this.services.set(cacheKey, service);

    return service;
  }

  /**
   * @deprecated Use getServiceByConfig instead for database-driven connectors.
   */
  getService<T extends ConnectorServiceBase<any, any>>(connectorType: ConnectorType): T {
    if (!this.services.has(connectorType)) {
      const ConnectorServiceClass = connectorServices[connectorType] as ConnectorServiceConstructor<T>;
      if (!ConnectorServiceClass) {
        throw new AItError("CONNECTOR_UNKNOWN", `Unknown connector type: ${connectorType}`);
      }
      this.services.set(connectorType, new (ConnectorServiceClass as any)({} as any)); // Warning: empty config for legacy
    }
    return this.services.get(connectorType) as T;
  }
}

export const connectorServiceFactory = new ConnectorServiceFactory();
