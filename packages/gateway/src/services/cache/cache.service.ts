import { type CacheAnalyticsService, getCacheAnalyticsService } from "../analytics/cache-analytics.service";

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null> | T | null;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
}

export interface CacheConfig {
  maxItems?: number;
  ttlMs?: number;
  provider?: ICacheProvider;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

export class MemoryCacheProvider implements ICacheProvider {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxItems: number;
  private readonly ttlMs: number;
  private readonly analytics: CacheAnalyticsService;
  private _statsUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
  private _lastStatsUpdate = 0;
  private static readonly STATS_UPDATE_INTERVAL_MS = 5000;

  constructor(config: CacheConfig = {}) {
    this.maxItems = config.maxItems ?? 100;
    this.ttlMs = config.ttlMs ?? 60 * 60 * 1000; // 1 hour default
    this.analytics = getCacheAnalyticsService();

    // Initialize analytics stats
    this.analytics.updateCacheStats({
      maxEntries: this.maxItems,
      entryCount: 0,
      estimatedMemoryMB: 0,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    // Evict if full
    if (this.cache.size >= this.maxItems && !this.cache.has(key)) {
      this._evictOldest();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);

    this._updateStats();
  }

  delete(key: string): void {
    this.cache.delete(key);
    this._updateStats();
  }

  clear(): void {
    this.cache.clear();
    this._updateStats();
  }

  private _evictOldest(): void {
    const iterator = this.cache.keys();
    const oldestKey = iterator.next().value;

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.analytics.recordEviction();
    }
  }

  private _scheduleStatsUpdate(): void {
    const now = Date.now();

    // If we've never updated or it's been long enough, update immediately
    if (this._lastStatsUpdate === 0 || now - this._lastStatsUpdate >= MemoryCacheProvider.STATS_UPDATE_INTERVAL_MS) {
      this._computeStats();
      this._lastStatsUpdate = now;
      return;
    }

    // Otherwise, schedule a debounced update
    if (!this._statsUpdateTimeout) {
      this._statsUpdateTimeout = setTimeout(
        () => {
          this._computeStats();
          this._lastStatsUpdate = Date.now();
          this._statsUpdateTimeout = null;
        },
        MemoryCacheProvider.STATS_UPDATE_INTERVAL_MS - (now - this._lastStatsUpdate),
      );
    }
  }

  private _computeStats(): void {
    const entryCount = this.cache.size;

    // Fast path: if cache is empty or small, just count entries
    if (entryCount <= 5) {
      this.analytics.updateCacheStats({
        entryCount,
        estimatedMemoryMB: entryCount * 0.002,
      });
      return;
    }

    const sampleSize = Math.min(entryCount, 5);
    let sampleBytes = 0;
    let samples = 0;
    const iterator = this.cache.entries();

    for (let i = 0; i < sampleSize; i++) {
      const entry = iterator.next();
      if (entry.done) break;

      const [key, value] = entry.value;
      // Estimate key size
      sampleBytes += key.length * 2 + 100;

      // Sample value size (only for first few)
      if (samples < 3) {
        try {
          const json = JSON.stringify(value.value);
          sampleBytes += json.length * 2;
          samples++;
        } catch {
          sampleBytes += 2048; // Fallback estimate
          samples++;
        }
      }
    }

    const avgEntrySize = samples > 0 ? sampleBytes / sampleSize : 2048;
    const estimatedBytes = avgEntrySize * entryCount;

    this.analytics.updateCacheStats({
      entryCount,
      estimatedMemoryMB: estimatedBytes / (1024 * 1024),
    });
  }

  /**
   * @deprecated Use _scheduleStatsUpdate() instead for debounced updates
   */
  private _updateStats(): void {
    this._scheduleStatsUpdate();
  }
}

export interface ICacheService extends ICacheProvider {}

export class CacheService implements ICacheService {
  private readonly provider: ICacheProvider;

  constructor(config: CacheConfig = {}) {
    this.provider = config.provider || new MemoryCacheProvider(config);
  }

  get<T>(key: string): Promise<T | null> | T | null {
    return this.provider.get<T>(key);
  }

  set<T>(key: string, value: T, ttlMs?: number): Promise<void> | void {
    return this.provider.set(key, value, ttlMs);
  }

  delete(key: string): Promise<void> | void {
    return this.provider.delete(key);
  }

  clear(): Promise<void> | void {
    return this.provider.clear();
  }
}

// Singleton instance
let _cacheService: CacheService | null = null;

export function getCacheService(config?: CacheConfig): CacheService {
  if (!_cacheService) {
    _cacheService = new CacheService(config);
  }
  return _cacheService;
}

export function setCacheProvider(provider: ICacheProvider): void {
  _cacheService = new CacheService({ provider });
}

export function resetCacheService(): void {
  _cacheService = null;
}
