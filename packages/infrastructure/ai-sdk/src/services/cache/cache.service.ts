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

  private _updateStats(): void {
    let estimatedBytes = 0;
    const sampleSize = Math.min(this.cache.size, 10);
    let sampleBytes = 0;
    let samples = 0;

    if (this.cache.size > 0) {
      for (const [key, entry] of this.cache.entries()) {
        estimatedBytes += key.length * 2 + 100;

        if (samples < sampleSize) {
          try {
            const json = JSON.stringify(entry.value);
            sampleBytes += json.length * 2;
            samples++;
          } catch {
            // Fallback for circular refs or non-serializable
            sampleBytes += 2048;
            samples++;
          }
        }
      }

      const avgValueSize = samples > 0 ? sampleBytes / samples : 0;
      estimatedBytes += avgValueSize * this.cache.size;
    }

    this.analytics.updateCacheStats({
      entryCount: this.cache.size,
      estimatedMemoryMB: estimatedBytes / (1024 * 1024),
    });
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
