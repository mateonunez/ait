import type {
  HealthData,
  PerformanceData,
  CacheData,
  CostData,
  ErrorData,
  QualityData,
  FeedbackData,
  SystemData,
} from "@ait/core";
import { getLogger } from "@ait/core";
import { apiGet } from "./http-client";

const logger = getLogger();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:3000/api";

/**
 * Fetch health check metrics
 */
export async function fetchHealthMetrics(): Promise<HealthData> {
  const res = await apiGet<HealthData>(`${API_BASE_URL}/observability/health`, {
    isSuccessStatus: (status) => status === 200 || status === 503,
  });

  if (!res.ok) {
    logger.error("[Stats API] Health fetch failed:", { error: res.error });
    throw new Error(res.error || "Failed to fetch health metrics");
  }

  return res.data as HealthData;
}

/**
 * Fetch performance metrics
 */
export async function fetchPerformanceMetrics(windowMinutes = 60): Promise<PerformanceData> {
  const res = await apiGet<PerformanceData>(`${API_BASE_URL}/observability/performance?window=${windowMinutes}`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch performance metrics");
  return res.data as PerformanceData;
}

/**
 * Fetch cache metrics
 */
export async function fetchCacheMetrics(windowMinutes = 60): Promise<CacheData> {
  const res = await apiGet<CacheData>(`${API_BASE_URL}/observability/cache?window=${windowMinutes}`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch cache metrics");
  return res.data as CacheData;
}

/**
 * Fetch cost metrics
 */
export async function fetchCostMetrics(): Promise<CostData> {
  const res = await apiGet<CostData>(`${API_BASE_URL}/observability/cost`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch cost metrics");
  return res.data as CostData;
}

/**
 * Fetch error metrics
 */
export async function fetchErrorMetrics(windowMinutes = 60): Promise<ErrorData> {
  const res = await apiGet<ErrorData>(`${API_BASE_URL}/observability/errors?window=${windowMinutes}`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch error metrics");
  return res.data as ErrorData;
}

/**
 * Fetch quality metrics
 */
export async function fetchQualityMetrics(windowMinutes = 60): Promise<QualityData> {
  const res = await apiGet<QualityData>(`${API_BASE_URL}/observability/quality?window=${windowMinutes}`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch quality metrics");
  return res.data as QualityData;
}

/**
 * Fetch feedback statistics
 */
export async function fetchFeedbackStats(windowMinutes = 60): Promise<FeedbackData> {
  const res = await apiGet<FeedbackData>(`${API_BASE_URL}/feedback/stats?window=${windowMinutes}`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch feedback stats");
  return res.data as FeedbackData;
}

/**
 * Fetch system information
 */
/**
 * Fetch system information
 */
export async function fetchSystemInfo(): Promise<SystemData> {
  const res = await apiGet<SystemData>(`${API_BASE_URL}/observability/system`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch system info");
  return res.data as SystemData;
}

/**
 * Unified stats response type
 */
export interface UnifiedStatsResponse {
  timestamp: string;
  window: string;
  health: HealthData;
  performance: PerformanceData;
  cache: CacheData;
  cost: CostData;
  errors: ErrorData;
  quality: QualityData;
  system: SystemData;
}

/**
 * Fetch unified stats from single endpoint
 * This is the preferred method - single source of truth
 */
export async function fetchUnifiedStats(windowMinutes = 60): Promise<UnifiedStatsResponse> {
  const res = await apiGet<UnifiedStatsResponse>(`${API_BASE_URL}/observability/stats?window=${windowMinutes}`);
  if (!res.ok) {
    logger.error("[Stats API] Unified stats fetch failed:", { error: res.error });
    throw new Error(res.error || "Failed to fetch unified stats");
  }

  return res.data as UnifiedStatsResponse;
}

/**
 * Fetch all metrics using unified endpoint
 * This replaces the previous parallel fetch approach for better performance
 */
export async function fetchAllMetrics(windowMinutes = 60) {
  try {
    logger.info("[Stats API] Fetching unified stats with window:", { windowMinutes });
    const unifiedStats = await fetchUnifiedStats(windowMinutes);

    // Transform unified response to match expected format
    const result = {
      health: unifiedStats.health,
      performance: unifiedStats.performance,
      cache: unifiedStats.cache,
      cost: unifiedStats.cost,
      errors: unifiedStats.errors,
      quality: unifiedStats.quality,
      feedback: null, // Feedback is now part of quality data
      system: unifiedStats.system,
      fetchErrors: {},
    };

    logger.info("[Stats API] Unified stats fetch complete. All metrics loaded successfully.");

    return result;
  } catch (error) {
    logger.error("[Stats API] Failed to fetch unified stats:", { error });
    // Return empty result on error
    return {
      health: null,
      performance: null,
      cache: null,
      cost: null,
      errors: null,
      quality: null,
      feedback: null,
      system: null,
      fetchErrors: {
        unified: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Fetch discovery stats
 */
export async function fetchDiscoveryStats(range: "week" | "month" | "year" = "week"): Promise<any> {
  const res = await apiGet<any>(`${API_BASE_URL}/discovery/stats?range=${range}`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch discovery stats");
  return res.data;
}
