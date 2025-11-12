export interface HealthData {
  status: "healthy" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  services: {
    analytics: string;
    telemetry: string;
  };
  health: {
    healthy: boolean;
    issues: string[];
    metrics: {
      errorRate: string;
      p95Latency: string;
      throughput: string;
      errorSpike: boolean;
    };
  };
}

export interface PerformanceData {
  timestamp: string;
  window: string;
  latency: {
    milliseconds: {
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
      min: number;
      max: number;
      mean: number;
    };
    seconds: {
      p50: string;
      p75: string;
      p90: string;
      p95: string;
      p99: string;
      mean: string;
    };
    count: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  errorRate: {
    percentage: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
  };
  cache: {
    hitRate: number;
  };
}

export interface CacheData {
  timestamp: string;
  window: string;
  effectiveness: {
    hitRate: string;
    totalHits: number;
    totalMisses: number;
    avgLatencySaving: string;
    totalLatencySaved: string;
  };
  size: {
    entryCount: number;
    estimatedMemoryMB: string;
    maxEntries: number;
    evictionCount: number;
  };
  costSavings: {
    embeddingsSaved: string;
    retrievalsSaved: number;
    estimatedSavingsPerDay: string;
  };
  topQueries: Array<{
    query: string;
    hits: number;
    avgDocuments: string;
    lastHit: string;
  }>;
  timeline: Array<{
    timestamp: string;
    hits: number;
    misses: number;
    hitRate: string;
  }>;
}

export interface CostData {
  timestamp: string;
  cost: {
    total: {
      amount: number;
      formatted: string;
      currency: string;
    };
    generation: {
      amount: number;
      formatted: string;
      tokens: number;
    };
    embedding: {
      amount: number;
      formatted: string;
      tokens: number;
    };
  };
  projections: {
    daily: {
      amount: number;
      formatted: string;
    };
    monthly: {
      amount: number;
      formatted: string;
    };
  };
}

export interface ErrorData {
  timestamp: string;
  window: string;
  summary: {
    totalErrors: number;
    retrySuccessRate: string;
    averageRetryAttempts: string;
    errorSpike: boolean;
  };
  byCategory: Array<{
    category: string;
    count: number;
    percentage: number;
    uniqueFingerprints: number;
    isRetryable: boolean;
    suggestedAction?: string;
  }>;
  topErrors: Array<{
    fingerprint: string;
    count: number;
    category: string;
    severity: string;
    message: string;
    isRetryable: boolean;
    suggestedAction?: string;
  }>;
  timeline: Array<{
    timestamp: string;
    count: number;
  }>;
}

export interface QualityData {
  timestamp: string;
  window: string;
  qualityScore: number;
  feedback: {
    total: number;
    thumbsUp: number;
    thumbsDown: number;
    neutral: number;
    thumbsUpRate: string;
  };
  health: {
    isDegrading: boolean;
    status: "excellent" | "good" | "fair" | "poor";
  };
  trend: Array<{
    timestamp: string;
    score: number;
    totalFeedback: number;
    thumbsUp: number;
    thumbsDown: number;
  }>;
  problematicTraces: Array<{
    traceId: string;
    messageId: string;
    rating: string;
    comment?: string;
    timestamp: string;
    userId?: string;
  }>;
}

export interface FeedbackData {
  timestamp: string;
  window: string;
  stats: {
    total: number;
    thumbsUp: number;
    thumbsDown: number;
    neutral: number;
    thumbsUpRate: string;
    qualityScore: string;
  };
}

export interface SystemData {
  timestamp: string;
  process: {
    uptime: string;
    uptimeSeconds: number;
    pid: number;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
}
