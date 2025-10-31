import type {
  HealthData,
  PerformanceData,
  CacheData,
  CostData,
  ErrorData,
  QualityData,
  FeedbackData,
  SystemData,
} from "@/types/stats.types";

const API_BASE_URL = "http://localhost:3000/api";

/**
 * Fetch health check metrics
 */
export async function fetchHealthMetrics(): Promise<HealthData> {
  const response = await fetch(`${API_BASE_URL}/observability/health`);
  if (!response.ok) {
    throw new Error(`Failed to fetch health metrics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch performance metrics
 */
export async function fetchPerformanceMetrics(windowMinutes = 60): Promise<PerformanceData> {
  const response = await fetch(`${API_BASE_URL}/observability/performance?window=${windowMinutes}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch performance metrics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch cache metrics
 */
export async function fetchCacheMetrics(windowMinutes = 60): Promise<CacheData> {
  const response = await fetch(`${API_BASE_URL}/observability/cache?window=${windowMinutes}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch cache metrics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch cost metrics
 */
export async function fetchCostMetrics(): Promise<CostData> {
  const response = await fetch(`${API_BASE_URL}/observability/cost`);
  if (!response.ok) {
    throw new Error(`Failed to fetch cost metrics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch error metrics
 */
export async function fetchErrorMetrics(windowMinutes = 60): Promise<ErrorData> {
  const response = await fetch(`${API_BASE_URL}/observability/errors?window=${windowMinutes}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch error metrics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch quality metrics
 */
export async function fetchQualityMetrics(windowMinutes = 60): Promise<QualityData> {
  const response = await fetch(`${API_BASE_URL}/observability/quality?window=${windowMinutes}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quality metrics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch feedback statistics
 */
export async function fetchFeedbackStats(windowMinutes = 60): Promise<FeedbackData> {
  const response = await fetch(`${API_BASE_URL}/feedback/stats?window=${windowMinutes}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch feedback stats: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch system information
 */
export async function fetchSystemInfo(): Promise<SystemData> {
  const response = await fetch(`${API_BASE_URL}/observability/system`);
  if (!response.ok) {
    throw new Error(`Failed to fetch system info: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch all metrics in parallel
 */
export async function fetchAllMetrics(windowMinutes = 60) {
  try {
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

    return {
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
  } catch (error) {
    console.error("[Stats API] Failed to fetch all metrics:", error);
    throw error;
  }
}
