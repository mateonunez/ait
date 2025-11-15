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

import { apiGet } from "./http-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:3000/api";

/**
 * Fetch health check metrics
 */
export async function fetchHealthMetrics(): Promise<HealthData> {
  const res = await apiGet<HealthData>(`${API_BASE_URL}/observability/health`, {
    isSuccessStatus: (status) => status === 200 || status === 503,
  });

  if (!res.ok) {
    console.error("[Stats API] Health fetch failed:", res.error);
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
export async function fetchSystemInfo(): Promise<SystemData> {
  const res = await apiGet<SystemData>(`${API_BASE_URL}/observability/system`);
  if (!res.ok) throw new Error(res.error || "Failed to fetch system info");
  return res.data as SystemData;
}

/**
 * Fetch all metrics in parallel
 */
export async function fetchAllMetrics(windowMinutes = 60) {
  try {
    console.log("[Stats API] Fetching all metrics with window:", windowMinutes);
    const [health, performance, cache, cost, errors, quality, feedback, system] = await Promise.allSettled([
      fetchHealthMetrics(),
      fetchPerformanceMetrics(windowMinutes),
      fetchCacheMetrics(windowMinutes),
      fetchCostMetrics(),
      fetchErrorMetrics(windowMinutes),
      fetchQualityMetrics(windowMinutes),
      fetchFeedbackStats(windowMinutes),
      fetchSystemInfo(),
    ]);

    // Log rejected promises
    if (health.status === "rejected") console.error("[Stats API] Health failed:", health.reason);
    if (performance.status === "rejected") console.error("[Stats API] Performance failed:", performance.reason);
    if (cache.status === "rejected") console.error("[Stats API] Cache failed:", cache.reason);
    if (cost.status === "rejected") console.error("[Stats API] Cost failed:", cost.reason);
    if (errors.status === "rejected") console.error("[Stats API] Errors failed:", errors.reason);
    if (quality.status === "rejected") console.error("[Stats API] Quality failed:", quality.reason);
    if (feedback.status === "rejected") console.error("[Stats API] Feedback failed:", feedback.reason);
    if (system.status === "rejected") console.error("[Stats API] System failed:", system.reason);

    const result = {
      health: health.status === "fulfilled" ? health.value : null,
      performance: performance.status === "fulfilled" ? performance.value : null,
      cache: cache.status === "fulfilled" ? cache.value : null,
      cost: cost.status === "fulfilled" ? cost.value : null,
      errors: errors.status === "fulfilled" ? errors.value : null,
      quality: quality.status === "fulfilled" ? quality.value : null,
      feedback: feedback.status === "fulfilled" ? feedback.value : null,
      system: system.status === "fulfilled" ? system.value : null,
      fetchErrors: {
        health: health.status === "rejected" ? health.reason : null,
        performance: performance.status === "rejected" ? performance.reason : null,
        cache: cache.status === "rejected" ? cache.reason : null,
        cost: cost.status === "rejected" ? cost.reason : null,
        errors: errors.status === "rejected" ? errors.reason : null,
        quality: quality.status === "rejected" ? quality.reason : null,
        feedback: feedback.status === "rejected" ? feedback.reason : null,
        system: system.status === "rejected" ? system.reason : null,
      },
    };

    console.log("[Stats API] Fetch complete. Results:", {
      health: !!result.health,
      performance: !!result.performance,
      cache: !!result.cache,
      cost: !!result.cost,
      errors: !!result.errors,
      quality: !!result.quality,
      feedback: !!result.feedback,
      system: !!result.system,
    });

    return result;
  } catch (error) {
    console.error("[Stats API] Failed to fetch all metrics:", error);
    throw error;
  }
}
