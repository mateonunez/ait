import { getLogger } from "@ait/core";
import { eng, removeStopwords } from "stopword";
import { recordSpan } from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";
import { getCacheAnalyticsService } from "../analytics/cache-analytics.service";
import type { ICacheProvider } from "./cache.service";
import { getCacheService } from "./cache.service";
import { getSemanticQueryNormalizer } from "./semantic-query-normalizer.service";

const logger = getLogger();

export interface SemanticCacheConfig {
  similarityThreshold?: number;
  ttlMs?: number;
  maxQueries?: number; // Deprecated in distributed mode
  cacheProvider?: ICacheProvider;
  useLlmNormalization?: boolean;
}

interface SemanticCacheEntry {
  query: string;
  queryHash: string;
  response: unknown;
  timestamp: number;
  hitCount: number;
}

export class SemanticCacheService {
  private readonly config: Required<SemanticCacheConfig>;

  constructor(config: SemanticCacheConfig = {}) {
    this.config = {
      similarityThreshold: config.similarityThreshold ?? 0.85,
      ttlMs: config.ttlMs ?? 15 * 60 * 1000, // 15 minutes default
      maxQueries: config.maxQueries ?? 500, // No longer enforced locally
      cacheProvider: config.cacheProvider ?? getCacheService(),
      useLlmNormalization: config.useLlmNormalization ?? true,
    };
  }

  /**
   * Get cached response for a semantically similar query
   * @param query The user query to look up
   * @param context Optional context suffix (e.g., collection info) that won't be normalized
   * @param traceContext Optional trace context for telemetry
   */
  async get<T>(query: string, context?: string, traceContext?: TraceContext): Promise<T | null> {
    const startTime = Date.now();
    const analytics = getCacheAnalyticsService();

    // 1. Normalize
    const normalizedQuery = await this._getNormalizedQuery(query);
    const normalizedKey = context ? `${normalizedQuery}|${context}` : normalizedQuery;

    // 2. Lookup Hash in Index (Distributed)
    const indexKey = this.buildIndexKey(normalizedKey);
    const hash = await this.config.cacheProvider.get<string>(indexKey);

    if (!hash) {
      this._recordMiss(query, normalizedKey, startTime, analytics, traceContext);
      logger.debug("Semantic cache miss (index miss)", { query: query.slice(0, 50) });
      return null;
    }

    // 3. Lookup Content
    const cacheKey = this.buildCacheKey(hash);
    const result = this.config.cacheProvider.get<SemanticCacheEntry>(cacheKey);
    const entry = result instanceof Promise ? await result : result;

    if (!entry) {
      // Index existed but content didn't (expiry race condition)
      // We should clean up the index entry
      await this.config.cacheProvider.delete(indexKey);

      this._recordMiss(query, normalizedKey, startTime, analytics, traceContext, "stale_entry");
      return null;
    }

    // 4. Update Hit Count & Extend TTL
    entry.hitCount++;
    // Extend TTL for both valid entries
    await Promise.all([
      this.config.cacheProvider.set(cacheKey, entry, this.config.ttlMs),
      this.config.cacheProvider.set(indexKey, hash, this.config.ttlMs),
    ]);

    const latency = Date.now() - startTime;
    analytics.recordCacheHit(query, latency, 1);

    if (traceContext) {
      recordSpan(
        "semantic-cache-hit",
        "cache",
        traceContext,
        { query: query.slice(0, 100), hash },
        { cacheHit: true, hitCount: entry.hitCount, latencyMs: latency },
      );
    }

    logger.debug("Semantic cache hit", { query: query.slice(0, 50), hitCount: entry.hitCount });
    return entry.response as T;
  }

  /**
   * Cache a response for the given query
   * @param query The user query to cache
   * @param response The response to cache
   * @param context Optional context suffix (e.g., collection info) that won't be normalized
   */
  async set<T>(query: string, response: T, context?: string): Promise<void> {
    const normalizedQuery = await this._getNormalizedQuery(query);
    const normalizedKey = context ? `${normalizedQuery}|${context}` : normalizedQuery;
    const hash = this._hashQuery(normalizedKey);

    const entry: SemanticCacheEntry = {
      query,
      queryHash: hash,
      response,
      timestamp: Date.now(),
      hitCount: 0,
    };

    const cacheKey = this.buildCacheKey(hash);
    const indexKey = this.buildIndexKey(normalizedKey);

    // Save both Index and Content
    await Promise.all([
      this.config.cacheProvider.set(cacheKey, entry, this.config.ttlMs),
      this.config.cacheProvider.set(indexKey, hash, this.config.ttlMs),
    ]);

    logger.debug("Semantic cache set", { query: query.slice(0, 50), hash });
  }

  private _recordMiss(
    query: string,
    normalizedKey: string,
    startTime: number,
    analytics: ReturnType<typeof getCacheAnalyticsService>,
    trace: TraceContext | undefined,
    reason?: string,
  ) {
    const latency = Date.now() - startTime;
    analytics.recordCacheMiss(query, latency);

    if (trace) {
      recordSpan(
        "semantic-cache-miss",
        "cache",
        trace,
        { query: query.slice(0, 100), normalizedKey, reason },
        { cacheHit: false, latencyMs: latency },
      );
    }
  }

  /**
   * Get normalized query using either LLM-based or fallback normalization
   */
  private async _getNormalizedQuery(query: string): Promise<string> {
    if (this.config.useLlmNormalization) {
      try {
        const normalizer = getSemanticQueryNormalizer();
        return await normalizer.normalize(query);
      } catch (error) {
        logger.warn("LLM normalization failed, using fallback", { error });
        return this._normalizeQueryFallback(query);
      }
    }
    return this._normalizeQueryFallback(query);
  }

  private _normalizeQueryFallback(query: string): string {
    // Words to strip for semantic matching - these don't fundamentally change query intent
    const stripWords = [
      // Query verbs
      "please",
      "show",
      "tell",
      "give",
      "get",
      "find",
      "list",
      "want",
      "need",
      "like",
      "display",
      "fetch",
      "retrieve",
      "search",
      "look",
      "see",
      // Qualifiers
      "favorite",
      "favourite",
      "recent",
      "latest",
      "top",
      "best",
      "all",
      "some",
      "few",
      // Filler
      "just",
      "only",
      "basically",
      "actually",
      "really",
      "simply",
      // Time (handled by temporal filters)
      "today",
      "yesterday",
      "week",
      "month",
      "year",
      "last",
      "this",
    ];

    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 1);

    const withoutStopwords = removeStopwords(words, eng);
    const filtered = withoutStopwords.filter((word) => !stripWords.includes(word));

    const normalized = filtered.sort().join(" ").trim();
    return normalized;
  }

  private _hashQuery(normalized: string): string {
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `sq:${hash.toString(36)}`;
  }

  private buildCacheKey(hash: string): string {
    return `semantic:${hash}`;
  }

  private buildIndexKey(normalizedKey: string): string {
    return `semantic:index:${normalizedKey}`;
  }

  // Deprecated/No-op in distributed mode
  async clear(): Promise<void> {
    logger.warn("SemanticCacheService.clear() called - in distributed mode this relies on TTL or manual flush");
  }

  getStats(): { entryCount: number; maxQueries: number } {
    return {
      entryCount: -1, // Cannot easily count in distributed
      maxQueries: this.config.maxQueries,
    };
  }
}

let _semanticCacheService: SemanticCacheService | null = null;

export function getSemanticCacheService(config?: SemanticCacheConfig): SemanticCacheService {
  if (!_semanticCacheService) {
    _semanticCacheService = new SemanticCacheService(config);
  }
  return _semanticCacheService;
}

export function resetSemanticCacheService(): void {
  _semanticCacheService = null;
}
