import { apiConfig } from "@/config/api.config";
import type { IntegrationEntity } from "@/types/integrations.types";
import { type FeedRequirement, getLogger } from "@ait/core";
import { apiGet, apiPost } from "../utils/http-client";

const logger = getLogger();

/** Cache TTL for discovery feed (2 minutes) */
const DISCOVERY_CACHE_TTL_MS = 2 * 60 * 1000;

/** Maximum retry attempts for failed requests */
const MAX_RETRIES = 3;

/** Initial delay for retry backoff (ms) */
const INITIAL_RETRY_DELAY_MS = 500;

interface CacheEntry {
  data: Record<string, IntegrationEntity[]>;
  expiresAt: number;
}

// Simple in-memory cache for discovery data
const feedCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from requirements
 */
function getCacheKey(requirements: FeedRequirement[]): string {
  const sorted = [...requirements].sort((a, b) => a.entityType.localeCompare(b.entityType));
  return `feed:${sorted.map((r) => `${r.entityType}:${r.limit}`).join(",")}`;
}

/**
 * Sleep helper for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DiscoveryServiceOptions {
  /** Skip cache and fetch fresh data */
  skipCache?: boolean;
  /** Custom cache TTL */
  cacheTtlMs?: number;
}

export interface DailyActivity {
  date: string;
  [integrationKey: string]: number | string;
}

export interface DiscoveryStatsData {
  timeRange: "week" | "month" | "year";
  data: DailyActivity[];
  totals: Record<string, number>;
}

/**
 * Fetch discovery feed with caching and retry logic
 */
export async function fetchDiscoveryFeed(
  requirements: FeedRequirement[],
  options: DiscoveryServiceOptions = {},
): Promise<Record<string, IntegrationEntity[]>> {
  const { skipCache = false, cacheTtlMs = DISCOVERY_CACHE_TTL_MS } = options;
  const cacheKey = getCacheKey(requirements);

  // Check cache first
  if (!skipCache) {
    const cached = feedCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      logger.debug("[DiscoveryService] Cache hit", { cacheKey });
      return cached.data;
    }
  }

  const url = `${apiConfig.gatewayUrl}/api/discovery/feed`;
  let lastError: Error | null = null;

  // Retry with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await apiPost<Record<string, IntegrationEntity[]>>(url, { requirements });

      if (!res.ok) {
        throw new Error(res.error || "Failed to fetch discovery feed");
      }

      const data = res.data!;

      // Cache successful response
      if (!skipCache && data) {
        feedCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + cacheTtlMs,
        });
        logger.debug("[DiscoveryService] Cached feed data", { cacheKey, ttlMs: cacheTtlMs });
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn("[DiscoveryService] Fetch attempt failed", {
        attempt,
        maxRetries: MAX_RETRIES,
        error: lastError.message,
      });

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
        await sleep(delay);
      }
    }
  }

  logger.error("[DiscoveryService] All retry attempts failed", { error: lastError });
  throw lastError || new Error("Failed to fetch discovery feed");
}

/**
 * Fetch discovery stats with retries
 */
export async function fetchDiscoveryStats(range: "week" | "month" | "year" = "week"): Promise<DiscoveryStatsData> {
  const url = `${apiConfig.apiBaseUrl}/discovery/stats?range=${range}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await apiGet<unknown>(url);

      if (!res.ok) {
        throw new Error(res.error || "Failed to fetch discovery stats");
      }

      return res.data as DiscoveryStatsData;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn("[DiscoveryService] Stats fetch attempt failed", {
        attempt,
        maxRetries: MAX_RETRIES,
        error: lastError.message,
      });

      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error("Failed to fetch discovery stats");
}

/**
 * Clear the discovery feed cache
 */
export function clearDiscoveryCache(): void {
  feedCache.clear();
  logger.info("[DiscoveryService] Cache cleared");
}

/**
 * Invalidate a specific cache entry
 */
export function invalidateDiscoveryCache(requirements: FeedRequirement[]): void {
  const cacheKey = getCacheKey(requirements);
  feedCache.delete(cacheKey);
  logger.debug("[DiscoveryService] Cache entry invalidated", { cacheKey });
}
