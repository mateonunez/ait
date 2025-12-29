import type {
  CacheData,
  CostData,
  ErrorData,
  FeedbackData,
  HealthData,
  PerformanceData,
  QualityData,
  SystemData,
} from "@ait/core";
import { getLogger } from "@ait/core";
import { apiConfig } from "../config/api.config";
import { apiGet } from "../utils/http-client";

const logger = getLogger();

export async function fetchHealthMetrics(): Promise<HealthData> {
  const res = await apiGet<HealthData>(`${apiConfig.apiBaseUrl}/observability/health`, {
    isSuccessStatus: (status) => status === 200 || status === 503,
  });

  if (!res.ok) {
    logger.error("[ObservabilityService] Health fetch failed:", { error: res.error });
    throw new Error(res.error || "Failed to fetch health metrics");
  }

  return res.data as HealthData;
}

export async function fetchPerformanceMetrics(windowMinutes = 60): Promise<PerformanceData> {
  const res = await apiGet<PerformanceData>(
    `${apiConfig.apiBaseUrl}/observability/performance?window=${windowMinutes}`,
  );
  if (!res.ok) throw new Error(res.error || "Failed to fetch performance metrics");
  return res.data as PerformanceData;
}

export async function fetchCacheMetrics(windowMinutes = 60): Promise<CacheData> {
  const res = await apiGet<CacheData>(`${apiConfig.apiBaseUrl}/observability/cache?window=${windowMinutes}`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch cache metrics");
  return res.data as CacheData;
}

export async function fetchCostMetrics(): Promise<CostData> {
  const res = await apiGet<CostData>(`${apiConfig.apiBaseUrl}/observability/cost`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch cost metrics");
  return res.data as CostData;
}

export async function fetchErrorMetrics(windowMinutes = 60): Promise<ErrorData> {
  const res = await apiGet<ErrorData>(`${apiConfig.apiBaseUrl}/observability/errors?window=${windowMinutes}`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch error metrics");
  return res.data as ErrorData;
}

export async function fetchQualityMetrics(windowMinutes = 60): Promise<QualityData> {
  const res = await apiGet<QualityData>(`${apiConfig.apiBaseUrl}/observability/quality?window=${windowMinutes}`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch quality metrics");
  return res.data as QualityData;
}

export async function fetchFeedbackStats(windowMinutes = 60): Promise<FeedbackData> {
  const res = await apiGet<FeedbackData>(`${apiConfig.apiBaseUrl}/feedback/stats?window=${windowMinutes}`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch feedback stats");
  return res.data as FeedbackData;
}

export async function fetchSystemInfo(): Promise<SystemData> {
  const res = await apiGet<SystemData>(`${apiConfig.apiBaseUrl}/observability/system`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch system info");
  return res.data as SystemData;
}

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

export async function fetchUnifiedStats(windowMinutes = 60): Promise<UnifiedStatsResponse> {
  const res = await apiGet<UnifiedStatsResponse>(`${apiConfig.apiBaseUrl}/observability/stats?window=${windowMinutes}`);
  if (!res.ok) {
    logger.error("[ObservabilityService] Unified stats fetch failed:", { error: res.error });
    throw new Error(res.error || "Failed to fetch unified stats");
  }

  return res.data as UnifiedStatsResponse;
}

export async function fetchAllMetrics(windowMinutes = 60) {
  try {
    logger.info("[ObservabilityService] Fetching unified stats with window:", { windowMinutes });
    const unifiedStats = await fetchUnifiedStats(windowMinutes);

    const result = {
      health: unifiedStats.health,
      performance: unifiedStats.performance,
      cache: unifiedStats.cache,
      cost: unifiedStats.cost,
      errors: unifiedStats.errors,
      quality: unifiedStats.quality,
      feedback: null,
      system: unifiedStats.system,
      fetchErrors: {},
    };

    logger.info("[ObservabilityService] Unified stats fetch complete.");

    return result;
  } catch (error) {
    logger.error("[ObservabilityService] Failed to fetch unified stats:", { error });
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

export { fetchDiscoveryStats } from "./discovery.service";
