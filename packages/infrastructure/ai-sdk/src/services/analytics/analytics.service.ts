import { getPerformanceMetricsService, type PerformanceMetricsService } from "./performance-metrics.service";
import { getCostTrackingService, type CostTrackingService } from "./cost-tracking.service";
import { getFailureAnalysisService, type FailureAnalysisService } from "./failure-analysis.service";
import { getCacheAnalyticsService, type CacheAnalyticsService } from "./cache-analytics.service";
import type { ClassifiedError } from "../errors/error-classification.service";
import type { PerformanceSnapshot, CostBreakdown, ErrorStats } from "./types";

/**
 * Cache analytics summary
 */
export interface CacheAnalyticsSummary {
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  avgLatencySavingMs: number;
  entryCount: number;
  estimatedMemoryMB: number;
}

/**
 * Aggregated analytics data
 */
export interface AnalyticsSummary {
  performance: PerformanceSnapshot;
  cost: CostBreakdown;
  errors: ErrorStats[];
  retrySuccessRate: number;
  topErrors: Array<{ fingerprint: string; count: number; category: string; message: string }>;
  cache: CacheAnalyticsSummary;
  timestamp: number;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  defaultWindowMs?: number;
  autoTrackRequests?: boolean;
  generationModel?: string;
  embeddingModel?: string;
}

/**
 * Unified analytics service that aggregates metrics from all sources
 */
export class AnalyticsService {
  private performanceMetrics: PerformanceMetricsService;
  private costTracking: CostTrackingService;
  private failureAnalysis: FailureAnalysisService;
  private cacheAnalytics: CacheAnalyticsService;
  private config: Required<AnalyticsConfig>;

  constructor(config: AnalyticsConfig = {}) {
    this.performanceMetrics = getPerformanceMetricsService();
    this.costTracking = getCostTrackingService();
    this.failureAnalysis = getFailureAnalysisService();
    this.cacheAnalytics = getCacheAnalyticsService();

    this.config = {
      defaultWindowMs: config.defaultWindowMs ?? 60 * 60 * 1000, // 1 hour
      autoTrackRequests: config.autoTrackRequests ?? true,
      generationModel: config.generationModel ?? "gpt-oss:20b",
      embeddingModel: config.embeddingModel ?? "mxbai-embed-large",
    };
  }

  /**
   * Track a complete request lifecycle
   */
  trackRequest(params: {
    latencyMs: number;
    success: boolean;
    generationTokens?: number;
    embeddingTokens?: number;
    cacheHit?: boolean;
    error?: ClassifiedError;
    retryAttempt?: number;
  }): void {
    // Performance metrics
    this.performanceMetrics.recordLatency(params.latencyMs, {
      success: params.success,
      cacheHit: params.cacheHit,
    });
    this.performanceMetrics.recordRequest(params.success);

    if (params.cacheHit !== undefined) {
      this.performanceMetrics.recordCache(params.cacheHit);
    }

    // Cost tracking
    if (params.generationTokens) {
      this.costTracking.recordGeneration(params.generationTokens, this.config.generationModel);
    }
    if (params.embeddingTokens) {
      this.costTracking.recordEmbedding(params.embeddingTokens, this.config.embeddingModel);
    }

    // Error tracking
    if (params.error) {
      this.failureAnalysis.recordError(params.error, params.retryAttempt ?? 0);
    }
  }

  /**
   * Track a successful retry
   */
  trackRetrySuccess(errorFingerprint: string): void {
    this.failureAnalysis.markResolved(errorFingerprint);
  }

  /**
   * Get comprehensive analytics summary
   */
  getSummary(windowMs?: number): AnalyticsSummary {
    const window = windowMs ?? this.config.defaultWindowMs;

    const performance = this.performanceMetrics.getSnapshot(window);
    const cost = this.costTracking.getTotalCost(this.config.generationModel, this.config.embeddingModel);
    const errors = this.failureAnalysis.getErrorStatsByCategory(window);
    const retrySuccessRate = this.failureAnalysis.getRetrySuccessRate(window);
    const topErrorsRaw = this.failureAnalysis.getTopErrors(10, window);

    const topErrors = topErrorsRaw.map((err) => ({
      fingerprint: err.fingerprint,
      count: err.count,
      category: err.example.category,
      message: err.example.message,
    }));

    // Cache analytics
    const cacheEffectiveness = this.cacheAnalytics.getCacheEffectiveness(window);
    const cacheStats = this.cacheAnalytics.getCacheStats();
    const cache: CacheAnalyticsSummary = {
      hitRate: cacheEffectiveness.hitRate,
      totalHits: cacheEffectiveness.totalHits,
      totalMisses: cacheEffectiveness.totalMisses,
      avgLatencySavingMs: cacheEffectiveness.avgLatencySavingMs,
      entryCount: cacheStats.entryCount,
      estimatedMemoryMB: cacheStats.estimatedMemoryMB,
    };

    return {
      performance,
      cost,
      errors,
      retrySuccessRate,
      topErrors,
      cache,
      timestamp: Date.now(),
    };
  }

  /**
   * Get performance metrics service
   */
  getPerformanceMetrics(): PerformanceMetricsService {
    return this.performanceMetrics;
  }

  /**
   * Get cost tracking service
   */
  getCostTracking(): CostTrackingService {
    return this.costTracking;
  }

  /**
   * Get failure analysis service
   */
  getFailureAnalysis(): FailureAnalysisService {
    return this.failureAnalysis;
  }

  /**
   * Get cache analytics service
   */
  getCacheAnalytics(): CacheAnalyticsService {
    return this.cacheAnalytics;
  }

  /**
   * Check if system health is degraded
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    metrics: {
      errorRate: number;
      p95Latency: number;
      throughput: number;
      errorSpike: boolean;
    };
  } {
    const issues: string[] = [];
    const errorRate = this.performanceMetrics.getErrorRate();
    const latency = this.performanceMetrics.getLatencyMetrics(5 * 60 * 1000); // Last 5 minutes
    const throughput = this.performanceMetrics.getThroughput();
    const errorSpike = this.failureAnalysis.detectErrorSpikes();

    // Check error rate (threshold: 5%)
    if (errorRate > 5) {
      issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }

    // Check p95 latency (threshold: 10 seconds)
    if (latency.p95 > 10000) {
      issues.push(`High p95 latency: ${(latency.p95 / 1000).toFixed(2)}s`);
    }

    // Check for error spikes
    if (errorSpike) {
      issues.push("Error spike detected");
    }

    // Check throughput (warn if very low and have had requests)
    if (throughput < 0.01 && this.performanceMetrics.getTotalRequests() > 0) {
      issues.push("Very low throughput");
    }

    // Check cache hit rate (warn if very low and have cache operations)
    const cacheEffectiveness = this.cacheAnalytics.getCacheEffectiveness(5 * 60 * 1000);
    const totalCacheOps = cacheEffectiveness.totalHits + cacheEffectiveness.totalMisses;
    if (totalCacheOps > 10 && cacheEffectiveness.hitRate < 20) {
      issues.push(`Low cache hit rate: ${cacheEffectiveness.hitRate.toFixed(1)}%`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics: {
        errorRate,
        p95Latency: latency.p95,
        throughput,
        errorSpike,
      },
    };
  }

  /**
   * Reset all analytics data
   */
  reset(): void {
    this.performanceMetrics.reset();
    this.costTracking.reset();
    this.failureAnalysis.reset();
    this.cacheAnalytics.reset();
  }

  /**
   * Export analytics data for persistence
   */
  export(): {
    performance: {
      totalRequests: number;
      successCount: number;
      errorCount: number;
    };
    cost: CostBreakdown;
    timestamp: number;
  } {
    return {
      performance: {
        totalRequests: this.performanceMetrics.getTotalRequests(),
        successCount: this.performanceMetrics.getSuccessCount(),
        errorCount: this.performanceMetrics.getErrorCount(),
      },
      cost: this.costTracking.getTotalCost(this.config.generationModel, this.config.embeddingModel),
      timestamp: Date.now(),
    };
  }
}

// Singleton instance
let _analyticsService: AnalyticsService | null = null;

export function getAnalyticsService(config?: AnalyticsConfig): AnalyticsService {
  if (!_analyticsService) {
    _analyticsService = new AnalyticsService(config);
  }
  return _analyticsService;
}

export function resetAnalyticsService(): void {
  _analyticsService = null;
}
