import { type IntegrationVendor, getLogger } from "@ait/core";
import { and, connectorConfigs, eq, getPostgresClient, providers } from "@ait/postgres";

const logger = getLogger();

export class ConnectorGrantService {
  private _grantCache = new Map<string, { granted: boolean; timestamp: number }>();
  private readonly _cacheTtl = 1 * 60 * 1000; // 1 minute cache to respond quickly but allow updates

  async isGranted(vendor: IntegrationVendor, userId?: string): Promise<boolean> {
    const cacheKey = userId ? `${vendor}:${userId}` : `${vendor}:global`;
    const cached = this._grantCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this._cacheTtl) {
      return cached.granted;
    }

    try {
      const { db } = getPostgresClient();

      const provider = await db.query.providers.findFirst({
        where: eq(providers.slug, vendor),
        columns: { id: true, isEnabled: true },
      });

      if (!provider || !provider.isEnabled) {
        this._setCache(cacheKey, false);
        return false;
      }

      if (!userId) {
        this._setCache(cacheKey, true);
        return true;
      }

      const validConfig = await db.query.connectorConfigs.findFirst({
        where: and(
          eq(connectorConfigs.userId, userId),
          eq(connectorConfigs.isEnabled, true),
          eq(connectorConfigs.providerId, provider.id),
        ),
      });

      const isGranted = !!validConfig;

      this._setCache(cacheKey, isGranted);
      return isGranted;
    } catch (error) {
      logger.error(`Failed to check grant for ${vendor}`, { error });
      return false;
    }
  }

  async getGrantedVendors(userId: string): Promise<Set<IntegrationVendor>> {
    const { db } = getPostgresClient();

    const configs = await db.query.connectorConfigs.findMany({
      where: and(eq(connectorConfigs.userId, userId), eq(connectorConfigs.isEnabled, true)),
      with: {
        provider: {
          columns: { slug: true, isEnabled: true },
        },
      },
    });

    const granted = new Set<IntegrationVendor>();

    for (const config of configs) {
      if (config.provider?.isEnabled) {
        granted.add(config.provider.slug as IntegrationVendor);
      }
    }

    return granted;
  }

  private _setCache(key: string, granted: boolean) {
    this._grantCache.set(key, { granted, timestamp: Date.now() });
  }

  invalidateCache() {
    this._grantCache.clear();
  }
}

export const connectorGrantService = new ConnectorGrantService();
