import { getLogger } from "@ait/core";
import { getCacheService } from "../cache/cache.service";
import type { ActivityData, IntegrationActivity } from "./insights.types";
import { getIntegrationRegistryService, type ConnectorType } from "./integration-registry.service";

const logger = getLogger();

/**
 * Interface for connector service factory to avoid circular dependency
 * This matches the signature of ConnectorServiceFactory from @ait/connectors
 * Placed here to avoid circular dependencies
 */
export interface IConnectorServiceFactory {
  getService<T = any>(connectorType: ConnectorType): T;
}

/**
 * Service that aggregates activity data from all available connectors dynamically
 */
export class ActivityAggregatorService {
  private registry = getIntegrationRegistryService();
  private connectorServiceFactory: IConnectorServiceFactory;

  constructor(connectorServiceFactory: IConnectorServiceFactory) {
    this.connectorServiceFactory = connectorServiceFactory;
  }

  /**
   * Fetch activity data for all available integrations
   * Uses caching to avoid hitting connectors on every request
   */
  async fetchActivityData(range: "week" | "month" | "year"): Promise<ActivityData> {
    const days = range === "week" ? 7 : range === "month" ? 30 : 365;

    // Generate cache key based on range and current date (hourly cache)
    // This ensures we cache for reasonable periods while still getting fresh data
    const cacheKey = this.getCacheKey(range);

    // Check cache first
    const cacheService = getCacheService();
    // Handle both sync and async cache providers
    const cachedResult = cacheService.get<ActivityData>(cacheKey);
    const cached = cachedResult instanceof Promise ? await cachedResult : cachedResult;
    if (cached) {
      logger.info("Activity data served from cache", { range, cacheKey });
      return cached;
    }

    logger.info("Fetching fresh activity data", { range, days });
    const connectorTypes = this.registry.getAvailableConnectorTypes();

    // Build activity data object
    const activityData: ActivityData = {};

    // Fetch data from all connectors sequentially for better error handling
    for (const connectorType of connectorTypes) {
      try {
        const result = await this.fetchIntegrationActivity(connectorType, days);
        if (result.activity) {
          activityData[connectorType] = result.activity;
          logger.info(`Successfully fetched ${connectorType} activity`, {
            total: result.activity.total,
            dailyEntries: result.activity.daily.length,
          });
        }
      } catch (error: any) {
        logger.error(`Failed to fetch activity for ${connectorType}`, {
          error: error.message,
          stack: error.stack,
        });
        // Continue with other connectors
      }
    }

    const totals = Object.entries(activityData).map(([key, val]) => ({ [key]: val?.total || 0 }));
    logger.info("Activity data aggregated", {
      integrations: Object.keys(activityData),
      totals,
    });

    // Cache the result for 5 minutes (300 seconds) - short enough to be fresh, long enough to reduce load
    const setResult = cacheService.set(cacheKey, activityData, 300 * 1000);
    if (setResult instanceof Promise) {
      await setResult;
    }
    logger.debug("Activity data cached", { cacheKey, ttl: 300 });

    return activityData;
  }

  /**
   * Generate cache key based on range and current hour
   * This ensures we cache for reasonable periods while still getting fresh data
   */
  private getCacheKey(range: "week" | "month" | "year"): string {
    const now = new Date();
    // Cache key includes date and hour, so cache refreshes hourly
    const dateHour = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${now.getHours()}`;
    return `activity:${range}:${dateHour}`;
  }

  /**
   * Fetch activity data for a specific integration
   */
  private async fetchIntegrationActivity(
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

      const daily = this.groupByDay(entities, connectorType, days);
      const dailyTotal = daily.reduce((sum, day) => sum + day.count, 0);
      const total = apiTotal !== null ? apiTotal : Math.max(dailyTotal, entities.length);

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
          daily: this.generateEmptyDateRange(days),
        },
      };
    }
  }

  /**
   * Group entities by day based on their date field
   */
  private groupByDay(
    entities: any[],
    connectorType: ConnectorType,
    days: number,
  ): Array<{ date: string; count: number }> {
    const grouped = new Map<string, number>();
    const dateRange = this.generateDateRange(days);

    // Initialize all dates with 0
    for (const date of dateRange) {
      grouped.set(date, 0);
    }

    let validDatesCount = 0;
    let invalidDatesCount = 0;

    // Group entities by date
    for (const entity of entities) {
      const date = this.registry.extractDate(entity, connectorType);
      if (date) {
        const dateKey = date.toISOString().split("T")[0]!;
        if (grouped.has(dateKey)) {
          grouped.set(dateKey, (grouped.get(dateKey) || 0) + 1);
          validDatesCount++;
        } else {
          // Entity date is outside the range, but we still count it for debugging
          invalidDatesCount++;
        }
      } else {
        invalidDatesCount++;
        // Log first few failures for debugging
        if (invalidDatesCount <= 3) {
          const metadata = this.registry.getMetadata(connectorType);
          logger.debug(`Failed to extract date for ${connectorType} entity`, {
            connectorType,
            dateField: metadata?.dateField,
            entityKeys: Object.keys(entity || {}),
            fieldValue: entity?.[metadata?.dateField || ""],
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

  /**
   * Generate date range for the specified number of days
   */
  private generateDateRange(days: number): string[] {
    const dates: string[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split("T")[0]!);
    }

    return dates;
  }

  /**
   * Generate empty date range with zero counts
   */
  private generateEmptyDateRange(days: number): Array<{ date: string; count: number }> {
    return this.generateDateRange(days).map((date) => ({ date, count: 0 }));
  }
}

// Note: This service requires connectorServiceFactory to be injected
// Use createActivityAggregatorService() in gateway routes instead of getActivityAggregatorService()
// to avoid circular dependencies

export function createActivityAggregatorService(
  connectorServiceFactory: IConnectorServiceFactory,
): ActivityAggregatorService {
  return new ActivityAggregatorService(connectorServiceFactory);
}
