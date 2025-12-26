import {
  type ActivityData,
  ENTITY_METADATA,
  type EntityActivityBreakdown,
  type EntityType,
  type IntegrationActivity,
  type IntegrationVendor,
  getLogger,
} from "@ait/core";
import { getCacheService } from "../cache/cache.service";
import { getIntegrationRegistryService } from "./integration-registry.service";

const logger = getLogger();

export interface IConnectorServiceFactory {
  getService<T = any>(vendor: IntegrationVendor): T;
}

export class ActivityAggregatorService {
  private registry = getIntegrationRegistryService();
  private connectorServiceFactory: IConnectorServiceFactory;

  constructor(connectorServiceFactory: IConnectorServiceFactory) {
    this.connectorServiceFactory = connectorServiceFactory;
  }

  async fetchActivityData(range: "week" | "month" | "year"): Promise<ActivityData> {
    const days = range === "week" ? 7 : range === "month" ? 30 : 365;
    const cacheKey = this._getCacheKey(range);

    const cached = await this._getCachedData(cacheKey);
    if (cached) {
      logger.info("Activity data served from cache", { range, cacheKey });
      return cached;
    }

    logger.info("Fetching fresh activity data", { range, days });

    const vendors = this.registry.getAvailableVendors();
    const activityData: ActivityData = {};

    for (const vendor of vendors) {
      try {
        activityData[vendor] = await this._fetchVendorActivity(vendor, days);
      } catch (error) {
        logger.error(`Failed to fetch activity for ${vendor}`, { error });
        activityData[vendor] = this._getEmptyActivity(days);
      }
    }

    await this._cacheData(cacheKey, activityData);
    return activityData;
  }

  private async _fetchVendorActivity(vendor: IntegrationVendor, days: number): Promise<IntegrationActivity> {
    const service = this.connectorServiceFactory.getService(vendor);
    const entityTypes = this.registry.getEntitiesByVendor(vendor);

    const byEntity: Record<string, EntityActivityBreakdown> = {};
    let grandTotal = 0;
    const aggregatedDaily = new Map<string, number>();

    // Initialize daily map
    for (const date of this._generateDateRange(days)) {
      aggregatedDaily.set(date, 0);
    }

    for (const entityType of entityTypes) {
      const fetchConfig = this.registry.getFetchConfig(entityType);
      if (!fetchConfig) continue;

      try {
        const entityActivity = await this._fetchEntityActivity(service, entityType, fetchConfig, days);
        byEntity[entityType] = entityActivity;
        grandTotal += entityActivity.total;

        for (const { date, count } of entityActivity.daily) {
          aggregatedDaily.set(date, (aggregatedDaily.get(date) || 0) + count);
        }
      } catch (error: any) {
        logger.warn(`Failed to fetch ${entityType} for ${vendor}`, { error: error.message });
        byEntity[entityType] = {
          total: 0,
          daily: this._generateEmptyDaily(days),
          displayName: ENTITY_METADATA[entityType].labelPlural,
        };
      }
    }

    return {
      total: grandTotal,
      daily: Array.from(aggregatedDaily.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      byEntity,
    };
  }

  private async _fetchEntityActivity(
    service: any,
    entityType: EntityType,
    config: any,
    days: number,
  ): Promise<EntityActivityBreakdown> {
    if (typeof service[config.fetchMethod] !== "function") {
      throw new Error(`Method ${config.fetchMethod} not found on service`);
    }

    const response = await service[config.fetchMethod]({ limit: 10000, page: 1 });
    const entities = response?.data || [];

    const grouped = new Map<string, number>();
    const dateRange = this._generateDateRange(days);
    for (const date of dateRange) grouped.set(date, 0);

    for (const entity of entities) {
      const date = this.registry.extractDateFromEntity(entity, config.dateField);
      if (date) {
        const key = date.toISOString().split("T")[0]!;
        if (grouped.has(key)) grouped.set(key, (grouped.get(key) || 0) + 1);
      }
    }

    const daily = Array.from(grouped.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: daily.reduce((sum, d) => sum + d.count, 0),
      daily,
      displayName: ENTITY_METADATA[entityType].labelPlural,
    };
  }

  private _getCacheKey(range: string): string {
    const now = new Date();
    const ts = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
    return `activity:${range}:${ts}`;
  }

  private async _getCachedData(key: string): Promise<ActivityData | null> {
    const res = getCacheService().get<ActivityData>(key);
    return res instanceof Promise ? await res : res;
  }

  private async _cacheData(key: string, data: ActivityData): Promise<void> {
    const res = getCacheService().set(key, data, 300 * 1000);
    if (res instanceof Promise) await res;
  }

  private _getEmptyActivity(days: number): IntegrationActivity {
    return {
      total: 0,
      daily: this._generateEmptyDaily(days),
      byEntity: {},
    };
  }

  private _generateEmptyDaily(days: number): Array<{ date: string; count: number }> {
    return this._generateDateRange(days).map((date) => ({ date, count: 0 }));
  }

  private _generateDateRange(days: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]!);
    }
    return dates;
  }
}

export function createActivityAggregatorService(factory: IConnectorServiceFactory): ActivityAggregatorService {
  return new ActivityAggregatorService(factory);
}
