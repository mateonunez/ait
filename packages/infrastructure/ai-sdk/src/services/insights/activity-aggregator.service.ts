import { getLogger } from "@ait/core";
import { getCacheService } from "../cache/cache.service";
import type { ActivityData, IntegrationActivity } from "./insights.types";
import { type ConnectorType, getIntegrationRegistryService } from "./integration-registry.service";

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
          });
        } else {
          activityData[connectorType] = {
            total: 0,
            daily: this._generateEmptyDateRange(days),
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
    // Cache key includes date and hour, so cache refreshes hourly
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

    try {
      const service = this.connectorServiceFactory.getService(connectorType);
      const fetchMethodName = metadata.fetchMethod;

      if (typeof (service as any)[fetchMethodName] !== "function") {
        throw new Error(`Method ${fetchMethodName} not found on ${connectorType} service`);
      }

      const response = await service[fetchMethodName]({ limit: 10000, page: 1 });
      const entities = response?.data || [];

      const apiTotal = response?.total ?? response?.totalCount ?? response?.total_count ?? null;

      logger.debug(`Fetched ${entities.length} entities for ${connectorType}`, {
        connectorType,
        entityCount: entities.length,
        apiTotal,
        dateField: metadata.dateField,
      });

      const daily = this._groupByDay(entities, connectorType, days);
      const dailyTotal = daily.reduce((sum, day) => sum + day.count, 0);

      // Use dailyTotal as the source of truth for activity in the requested range.
      // apiTotal represents the total count in the DB/API, which might include historical data outside the range.
      // entities.length represents the number of fetched items, which also might include out-of-range items.
      const total = dailyTotal;

      logger.debug(`Activity calculated for ${connectorType}`, {
        connectorType,
        total,
        dailyTotal,
        apiTotal,
        dailyEntries: daily.length,
        entitiesWithValidDates: daily.reduce((sum, d) => sum + (d.count > 0 ? 1 : 0), 0),
      });

      const activity: IntegrationActivity = {
        total,
        daily,
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
        },
      };
    }
  }

  private _groupByDay(
    entities: any[],
    connectorType: ConnectorType,
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
      const date = this.registry.extractDate(entity, connectorType);
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
        if (invalidDatesCount <= 3) {
          const metadata = this.registry.getMetadata(connectorType);
          logger.debug(`Failed to extract date for ${connectorType} entity`, {
            connectorType,
            dateField: metadata?.dateField,
            entityKeys: Object.keys(entity || {}),
            fieldValue: entity?.[(metadata?.dateField as string) || ""],
          });
        }
      }
    }

    if (invalidDatesCount > 0) {
      logger.warn(`Date extraction issues for ${connectorType}`, {
        connectorType,
        totalEntities: entities.length,
        validDates: validDatesCount,
        invalidDates: invalidDatesCount,
      });
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
