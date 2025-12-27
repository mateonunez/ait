import type { MetricSnapshot, PercentileMetrics, PerformanceSnapshot } from "./types";

/**
 * Service for calculating performance metrics
 */
export class PerformanceMetricsService {
  private latencySnapshots: MetricSnapshot[] = [];
  private requestTimestamps: number[] = [];
  private errorCount = 0;
  private successCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private readonly maxSnapshots = 10000;

  /**
   * Record a request latency
   */
  recordLatency(latencyMs: number, metadata?: Record<string, unknown>): void {
    this.latencySnapshots.push({
      timestamp: Date.now(),
      value: latencyMs,
      metadata,
    });

    // Keep only recent snapshots
    if (this.latencySnapshots.length > this.maxSnapshots) {
      this.latencySnapshots = this.latencySnapshots.slice(-this.maxSnapshots);
    }
  }

  /**
   * Record a request completion
   */
  recordRequest(success: boolean): void {
    this.requestTimestamps.push(Date.now());

    if (success) {
      this.successCount++;
    } else {
      this.errorCount++;
    }

    // Keep only last hour of timestamps
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > oneHourAgo);
  }

  /**
   * Record cache hit or miss
   */
  recordCache(hit: boolean): void {
    if (hit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  /**
   * Calculate percentiles from an array of numbers
   */
  calculatePercentiles(values: number[]): PercentileMetrics {
    if (values.length === 0) {
      return {
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        mean: 0,
        count: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    const percentile = (p: number): number => {
      const index = Math.ceil((p / 100) * count) - 1;
      return sorted[Math.max(0, index)] ?? 0;
    };

    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;

    return {
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      min: sorted[0] ?? 0,
      max: sorted[count - 1] ?? 0,
      mean,
      count,
    };
  }

  /**
   * Get latency percentiles for a time range
   */
  getLatencyMetrics(windowMs = 60 * 60 * 1000): PercentileMetrics {
    const cutoff = Date.now() - windowMs;
    const recentLatencies = this.latencySnapshots
      .filter((snapshot) => snapshot.timestamp > cutoff)
      .map((snapshot) => snapshot.value);

    return this.calculatePercentiles(recentLatencies);
  }

  /**
   * Calculate throughput (requests per second) over a time window
   */
  getThroughput(windowMs = 60 * 1000): number {
    const cutoff = Date.now() - windowMs;
    const recentRequests = this.requestTimestamps.filter((ts) => ts > cutoff);

    if (recentRequests.length === 0) return 0;

    const actualWindowMs = Date.now() - Math.min(...recentRequests);
    return (recentRequests.length / actualWindowMs) * 1000; // requests per second
  }

  /**
   * Get error rate percentage
   */
  getErrorRate(): number {
    const total = this.errorCount + this.successCount;
    if (total === 0) return 0;
    return (this.errorCount / total) * 100;
  }

  /**
   * Get cache hit rate percentage
   */
  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    if (total === 0) return 0;
    return (this.cacheHits / total) * 100;
  }

  /**
   * Get complete performance snapshot
   */
  getSnapshot(windowMs = 60 * 60 * 1000): PerformanceSnapshot {
    return {
      latency: this.getLatencyMetrics(windowMs),
      throughput: this.getThroughput(60 * 1000), // 1 minute window for throughput
      errorRate: this.getErrorRate(),
      cacheHitRate: this.getCacheHitRate(),
      timestamp: Date.now(),
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.latencySnapshots = [];
    this.requestTimestamps = [];
    this.errorCount = 0;
    this.successCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get total request count
   */
  getTotalRequests(): number {
    return this.errorCount + this.successCount;
  }

  /**
   * Get success count
   */
  getSuccessCount(): number {
    return this.successCount;
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.errorCount;
  }
}

// Singleton instance
let _performanceMetricsService: PerformanceMetricsService | null = null;

export function getPerformanceMetricsService(): PerformanceMetricsService {
  if (!_performanceMetricsService) {
    _performanceMetricsService = new PerformanceMetricsService();
  }
  return _performanceMetricsService;
}
