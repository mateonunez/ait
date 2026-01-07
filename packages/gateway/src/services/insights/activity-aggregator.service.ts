import { type ActivityData, getLogger } from "@ait/core";
import { getActivityService } from "@ait/store";
import { getCacheService } from "../cache/cache.service";

const logger = getLogger();

/** Default cache TTL for activity data (5 minutes) */
const ACTIVITY_CACHE_TTL_MS = 5 * 60 * 1000;

export interface IConnectorServiceFactory {
  getService<T>(vendor: string): T;
}

export interface FetchActivityOptions {
  /** Bypass cache and fetch fresh data */
  skipCache?: boolean;
  /** Custom cache TTL in milliseconds */
  cacheTtlMs?: number;
}

export interface IActivityAggregatorService {
  fetchActivityData(
    range: "week" | "month" | "year",
    userId?: string,
    options?: FetchActivityOptions,
  ): Promise<ActivityData>;
  fetchHistoricalData(range: "week" | "month" | "year", userId?: string, periodsBack?: number): Promise<ActivityData[]>;
}

const activityService = getActivityService();

export class ActivityAggregatorService implements IActivityAggregatorService {
  async fetchActivityData(
    range: "week" | "month" | "year",
    userId = "default",
    options: FetchActivityOptions = {},
  ): Promise<ActivityData> {
    const { skipCache = false, cacheTtlMs = ACTIVITY_CACHE_TTL_MS } = options;
    const cacheKey = `activity:${userId}:${range}`;

    try {
      if (!skipCache) {
        const cachedResult = getCacheService().get<ActivityData>(cacheKey);
        const cached = cachedResult instanceof Promise ? await cachedResult : cachedResult;
        if (cached) {
          logger.debug("[ActivityAggregatorService] Cache hit", { cacheKey, range, userId });
          return cached;
        }
      }

      logger.info("[ActivityAggregatorService] Fetching activity data from @ait/store", { range, userId });

      const activityData = await activityService.getActivityData(range, userId);

      if (!skipCache && Object.keys(activityData).length > 0) {
        getCacheService().set(cacheKey, activityData, cacheTtlMs);
        logger.debug("[ActivityAggregatorService] Cached activity data", { cacheKey, ttlMs: cacheTtlMs });
      }

      return activityData;
    } catch (error) {
      logger.error("[ActivityAggregatorService] Failed to fetch activity data", { error });
      return {};
    }
  }

  async fetchHistoricalData(
    range: "week" | "month" | "year",
    userId = "default",
    periodsBack = 4,
  ): Promise<ActivityData[]> {
    try {
      logger.info("[ActivityAggregatorService] Fetching historical data", { range, userId, periodsBack });

      const periodPromises: Promise<ActivityData>[] = [];

      for (let i = 0; i < periodsBack; i++) {
        periodPromises.push(this.fetchActivityData(range, userId, { skipCache: i === 0 }));
      }

      const results = await Promise.all(periodPromises);
      return results.filter((data) => Object.keys(data).length > 0);
    } catch (error) {
      logger.error("[ActivityAggregatorService] Failed to fetch historical data", { error });
      return [];
    }
  }
}

export function createActivityAggregatorService(_factory?: IConnectorServiceFactory): ActivityAggregatorService {
  return new ActivityAggregatorService();
}
