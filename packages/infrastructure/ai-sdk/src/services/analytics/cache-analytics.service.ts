/**
 * Cache hit record
 */
interface CacheHitRecord {
  query: string;
  timestamp: number;
  latencyMs: number;
  documentCount: number;
  savedLatencyMs: number; // Estimated latency saved vs retrieval
}

/**
 * Cache miss record
 */
interface CacheMissRecord {
  query: string;
  timestamp: number;
  retrievalLatencyMs: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  entryCount: number;
  estimatedMemoryMB: number;
  maxEntries: number;
  evictionCount: number;
}

/**
 * Cache effectiveness metrics
 */
export interface CacheEffectiveness {
  hitRate: number; // percentage 0-100
  totalHits: number;
  totalMisses: number;
  avgLatencySavingMs: number;
  totalLatencySavedMs: number;
}

/**
 * Cache cost savings
 */
export interface CacheCostSavings {
  embeddingsSavedDollars: number;
  retrievalsSaved: number;
  estimatedSavingsPerDay: number;
}

/**
 * Query pattern
 */
export interface QueryPattern {
  query: string;
  hits: number;
  lastHit: number;
  avgDocumentCount: number;
}

/**
 * Service for tracking and analyzing RAG cache effectiveness
 */
export class CacheAnalyticsService {
  private cacheHits: CacheHitRecord[] = [];
  private cacheMisses: CacheMissRecord[] = [];
  private cacheStats: CacheStats = {
    entryCount: 0,
    estimatedMemoryMB: 0,
    maxEntries: 128,
    evictionCount: 0,
  };
  private readonly maxRecords = 10000;
  private readonly avgEmbeddingCostPer1K = 0.0001; // $0.0001 per 1K tokens
  private readonly avgRetrievalLatencyMs = 2000; // Assume 2s avg retrieval time

  /**
   * Record a cache hit
   */
  recordCacheHit(query: string, latencyMs: number, documentCount: number): void {
    const savedLatencyMs = Math.max(0, this.avgRetrievalLatencyMs - latencyMs);

    this.cacheHits.push({
      query,
      timestamp: Date.now(),
      latencyMs,
      documentCount,
      savedLatencyMs,
    });

    // Keep only recent records
    if (this.cacheHits.length > this.maxRecords) {
      this.cacheHits = this.cacheHits.slice(-this.maxRecords);
    }
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(query: string, retrievalLatencyMs: number): void {
    this.cacheMisses.push({
      query,
      timestamp: Date.now(),
      retrievalLatencyMs,
    });

    // Keep only recent records
    if (this.cacheMisses.length > this.maxRecords) {
      this.cacheMisses = this.cacheMisses.slice(-this.maxRecords);
    }
  }

  /**
   * Update cache statistics
   */
  updateCacheStats(stats: Partial<CacheStats>): void {
    this.cacheStats = { ...this.cacheStats, ...stats };
  }

  /**
   * Record cache eviction
   */
  recordEviction(): void {
    this.cacheStats.evictionCount++;
  }

  /**
   * Get cache effectiveness metrics for a time window
   */
  getCacheEffectiveness(windowMs = 60 * 60 * 1000): CacheEffectiveness {
    const cutoff = Date.now() - windowMs;
    const recentHits = this.cacheHits.filter((hit) => hit.timestamp > cutoff);
    const recentMisses = this.cacheMisses.filter((miss) => miss.timestamp > cutoff);

    const totalHits = recentHits.length;
    const totalMisses = recentMisses.length;
    const total = totalHits + totalMisses;

    if (total === 0) {
      return {
        hitRate: 0,
        totalHits: 0,
        totalMisses: 0,
        avgLatencySavingMs: 0,
        totalLatencySavedMs: 0,
      };
    }

    const hitRate = (totalHits / total) * 100;
    const totalLatencySavedMs = recentHits.reduce((sum, hit) => sum + hit.savedLatencyMs, 0);
    const avgLatencySavingMs = totalHits > 0 ? totalLatencySavedMs / totalHits : 0;

    return {
      hitRate,
      totalHits,
      totalMisses,
      avgLatencySavingMs,
      totalLatencySavedMs,
    };
  }

  /**
   * Get current cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  /**
   * Get query patterns (most frequently cached queries)
   */
  getQueryPatterns(limit = 10, windowMs = 60 * 60 * 1000): QueryPattern[] {
    const cutoff = Date.now() - windowMs;
    const recentHits = this.cacheHits.filter((hit) => hit.timestamp > cutoff);

    // Group by query
    const queryMap = new Map<string, { hits: number; lastHit: number; totalDocs: number }>();

    for (const hit of recentHits) {
      const existing = queryMap.get(hit.query);
      if (existing) {
        existing.hits++;
        existing.lastHit = Math.max(existing.lastHit, hit.timestamp);
        existing.totalDocs += hit.documentCount;
      } else {
        queryMap.set(hit.query, {
          hits: 1,
          lastHit: hit.timestamp,
          totalDocs: hit.documentCount,
        });
      }
    }

    // Convert to array and sort by hits
    const patterns: QueryPattern[] = Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query: query.slice(0, 100), // Truncate for display
        hits: data.hits,
        lastHit: data.lastHit,
        avgDocumentCount: data.totalDocs / data.hits,
      }))
      .sort((a, b) => b.hits - a.hits);

    return patterns.slice(0, limit);
  }

  /**
   * Calculate cost savings from cache hits
   */
  getCostSavings(windowMs = 60 * 60 * 1000): CacheCostSavings {
    const cutoff = Date.now() - windowMs;
    const recentHits = this.cacheHits.filter((hit) => hit.timestamp > cutoff);

    const retrievalsSaved = recentHits.length;

    // Estimate embedding cost saved
    // Each query would need embedding generation (~50 tokens avg)
    const avgTokensPerQuery = 50;
    const totalTokensSaved = retrievalsSaved * avgTokensPerQuery;
    const embeddingsSavedDollars = (totalTokensSaved / 1000) * this.avgEmbeddingCostPer1K;

    // Calculate per-day projection
    const actualWindowMinutes = windowMs / (60 * 1000);
    const minutesPerDay = 24 * 60;
    const projectionFactor = minutesPerDay / actualWindowMinutes;
    const estimatedSavingsPerDay = embeddingsSavedDollars * projectionFactor;

    return {
      embeddingsSavedDollars,
      retrievalsSaved,
      estimatedSavingsPerDay,
    };
  }

  /**
   * Get cache hit timeline (hits per time bucket)
   */
  getCacheHitTimeline(
    bucketSizeMs = 60 * 1000,
    windowMs = 60 * 60 * 1000,
  ): Array<{ timestamp: number; hits: number; misses: number }> {
    const cutoff = Date.now() - windowMs;
    const recentHits = this.cacheHits.filter((hit) => hit.timestamp > cutoff);
    const recentMisses = this.cacheMisses.filter((miss) => miss.timestamp > cutoff);

    const buckets = new Map<number, { hits: number; misses: number }>();

    // Process hits
    for (const hit of recentHits) {
      const bucket = Math.floor(hit.timestamp / bucketSizeMs) * bucketSizeMs;
      const existing = buckets.get(bucket) || { hits: 0, misses: 0 };
      existing.hits++;
      buckets.set(bucket, existing);
    }

    // Process misses
    for (const miss of recentMisses) {
      const bucket = Math.floor(miss.timestamp / bucketSizeMs) * bucketSizeMs;
      const existing = buckets.get(bucket) || { hits: 0, misses: 0 };
      existing.misses++;
      buckets.set(bucket, existing);
    }

    return Array.from(buckets.entries())
      .map(([timestamp, data]) => ({ timestamp, hits: data.hits, misses: data.misses }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Reset all cache analytics data
   */
  reset(): void {
    this.cacheHits = [];
    this.cacheMisses = [];
    this.cacheStats = {
      entryCount: 0,
      estimatedMemoryMB: 0,
      maxEntries: 128,
      evictionCount: 0,
    };
  }

  /**
   * Get total cache operations
   */
  getTotalOperations(windowMs?: number): number {
    if (!windowMs) {
      return this.cacheHits.length + this.cacheMisses.length;
    }

    const cutoff = Date.now() - windowMs;
    const recentHits = this.cacheHits.filter((hit) => hit.timestamp > cutoff).length;
    const recentMisses = this.cacheMisses.filter((miss) => miss.timestamp > cutoff).length;
    return recentHits + recentMisses;
  }
}

// Singleton instance
let _cacheAnalyticsService: CacheAnalyticsService | null = null;

export function getCacheAnalyticsService(): CacheAnalyticsService {
  if (!_cacheAnalyticsService) {
    _cacheAnalyticsService = new CacheAnalyticsService();
  }
  return _cacheAnalyticsService;
}

export function resetCacheAnalyticsService(): void {
  _cacheAnalyticsService = null;
}
