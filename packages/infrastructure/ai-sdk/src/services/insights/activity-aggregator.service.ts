import { getLogger } from "@ait/core";
import { getCacheService } from "../cache/cache.service";
import type { ActivityData, EntityActivityBreakdown, IntegrationActivity } from "./insights.types";
import { type ConnectorType, type EntityMetadata, getIntegrationRegistryService } from "./integration-registry.service";

const logger = getLogger();

export interface IConnectorServiceFactory {
  getService<T = any>(connectorType: ConnectorType): T;
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
    const cacheService = getCacheService();
    const cachedResult = cacheService.get<ActivityData>(cacheKey);
    const cached = cachedResult instanceof Promise ? await cachedResult : cachedResult;
    if (cached) {
      logger.info("Activity data served from cache", { range, cacheKey });
      return cached;
    }

    logger.info("Fetching fresh activity data", { range, days });

    const connectorTypes = this.registry.getAvailableConnectorTypes();
    const activityData: ActivityData = {};

    for (const connectorType of connectorTypes) {
      try {
        const result = await this._fetchIntegrationActivity(connectorType, days);
        if (result.activity) {
          activityData[connectorType] = result.activity;
          logger.info(`Successfully fetched ${connectorType} activity`, {
            total: result.activity.total,
            dailyEntries: result.activity.daily.length,
            entityCount: Object.keys(result.activity.byEntity || {}).length,
          });
        } else {
          activityData[connectorType] = {
            total: 0,
            daily: this._generateEmptyDateRange(days),
            byEntity: {},
          };
        }
      } catch (error: any) {
        logger.error(`Failed to fetch activity for ${connectorType}`, {
          error: error.message,
          stack: error.stack,
        });

        activityData[connectorType] = {
          total: 0,
          daily: this._generateEmptyDateRange(days),
          byEntity: {},
        };
      }
    }

    const totals = Object.entries(activityData).map(([key, val]) => ({ [key]: val?.total || 0 }));
    logger.info("Activity data aggregated", {
      integrations: Object.keys(activityData),
      totals,
    });

    const setResult = cacheService.set(cacheKey, activityData, 300 * 1000);
    if (setResult instanceof Promise) {
      await setResult;
    }
    logger.debug("Activity data cached", { cacheKey, ttl: 300 });

    return activityData;
  }

  private _getCacheKey(range: "week" | "month" | "year"): string {
    const now = new Date();
    const dateHour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${now.getHours()}`;
    return `activity:${range}:${dateHour}`;
  }

  private async _fetchIntegrationActivity(
    connectorType: ConnectorType,
    days: number,
  ): Promise<{ connectorType: ConnectorType; activity: IntegrationActivity }> {
    const metadata = this.registry.getMetadata(connectorType);
    if (!metadata) {
      throw new Error(`No metadata found for connector type: ${connectorType}`);
    }

    const entities = this.registry.getEntities(connectorType);
    if (entities.length === 0) {
      throw new Error(`No entities found for connector type: ${connectorType}`);
    }

    try {
      const service = this.connectorServiceFactory.getService(connectorType);
      const byEntity: Record<string, EntityActivityBreakdown> = {};
      let grandTotal = 0;
      const aggregatedDaily = new Map<string, number>();

      // Initialize date range
      for (const date of this._generateDateRange(days)) {
        aggregatedDaily.set(date, 0);
      }

      // Fetch activity for each entity type
      for (const entityMeta of entities) {
        try {
          const entityActivity = await this._fetchEntityActivity(service, entityMeta, days);
          byEntity[entityMeta.entityType] = entityActivity;
          grandTotal += entityActivity.total;

          // Aggregate daily counts
          for (const { date, count } of entityActivity.daily) {
            aggregatedDaily.set(date, (aggregatedDaily.get(date) || 0) + count);
          }

          logger.debug(`Fetched ${entityMeta.entityType} for ${connectorType}`, {
            total: entityActivity.total,
          });
        } catch (entityError: any) {
          logger.warn(`Failed to fetch ${entityMeta.entityType} for ${connectorType}`, {
            error: entityError.message,
          });
          // Add empty entry for this entity
          byEntity[entityMeta.entityType] = {
            total: 0,
            daily: this._generateEmptyDateRange(days),
            displayName: entityMeta.displayName,
          };
        }
      }

      const daily = Array.from(aggregatedDaily.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const activity: IntegrationActivity = {
        total: grandTotal,
        daily,
        byEntity,
      };

      return { connectorType, activity };
    } catch (error: any) {
      logger.error("Error fetching integration activity", {
        connectorType,
        error: error.message,
        stack: error.stack,
      });

      return {
        connectorType,
        activity: {
          total: 0,
          daily: this._generateEmptyDateRange(days),
          byEntity: {},
        },
      };
    }
  }

  private async _fetchEntityActivity(
    service: any,
    entityMeta: EntityMetadata,
    days: number,
  ): Promise<EntityActivityBreakdown> {
    if (typeof service[entityMeta.fetchMethod] !== "function") {
      throw new Error(`Method ${entityMeta.fetchMethod} not found on service`);
    }

    const response = await service[entityMeta.fetchMethod]({ limit: 10000, page: 1 });
    const entities = response?.data || [];

    logger.debug(`Fetched ${entities.length} ${entityMeta.entityType} entities`, {
      fetchMethod: entityMeta.fetchMethod,
    });

    const daily = this._groupByDay(entities, entityMeta.dateField, days);
    const total = daily.reduce((sum, day) => sum + day.count, 0);

    return {
      total,
      daily,
      displayName: entityMeta.displayName,
    };
  }

  private _groupByDay(
    entities: any[],
    dateField: string | string[],
    days: number,
  ): Array<{ date: string; count: number }> {
    const grouped = new Map<string, number>();
    const dateRange = this._generateDateRange(days);

    for (const date of dateRange) {
      grouped.set(date, 0);
    }

    let validDatesCount = 0;
    let invalidDatesCount = 0;

    for (const entity of entities) {
      const date = this.registry.extractDateFromEntity(entity, dateField);
      if (date) {
        const dateKey = date.toISOString().split("T")[0]!;
        if (grouped.has(dateKey)) {
          grouped.set(dateKey, (grouped.get(dateKey) || 0) + 1);
          validDatesCount++;
        } else {
          invalidDatesCount++;
        }
      } else {
        invalidDatesCount++;
      }
    }

    if (invalidDatesCount > 0) {
      logger.debug(`Date extraction: ${validDatesCount} valid, ${invalidDatesCount} invalid`);
    }

    return Array.from(grouped.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private _generateDateRange(days: number): string[] {
    const dates: string[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split("T")[0]!);
    }

    return dates;
  }

  private _generateEmptyDateRange(days: number): Array<{ date: string; count: number }> {
    return this._generateDateRange(days).map((date) => ({ date, count: 0 }));
  }
}

export function createActivityAggregatorService(
  connectorServiceFactory: IConnectorServiceFactory,
): ActivityAggregatorService {
  return new ActivityAggregatorService(connectorServiceFactory);
}
