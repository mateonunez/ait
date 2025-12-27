/**
 * Common types for analytics services
 */

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface MetricSnapshot {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface PercentileMetrics {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
  count: number;
}

export interface ErrorStats {
  category: string;
  count: number;
  percentage: number;
  fingerprints: string[];
  isRetryable: boolean;
  suggestedAction?: string;
}

export interface CostBreakdown {
  generationCost: number;
  embeddingCost: number;
  totalCost: number;
  generationTokens: number;
  embeddingTokens: number;
  currency: string;
}

export interface PerformanceSnapshot {
  latency: PercentileMetrics;
  throughput: number; // requests per second
  errorRate: number; // percentage
  cacheHitRate: number; // percentage
  timestamp: number;
}
