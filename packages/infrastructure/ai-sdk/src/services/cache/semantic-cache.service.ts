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
  maxQueries?: number;
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
  private readonly queryIndex = new Map<string, string>(); // normalized -> hash

  constructor(config: SemanticCacheConfig = {}) {
    this.config = {
      similarityThreshold: config.similarityThreshold ?? 0.85,
      ttlMs: config.ttlMs ?? 15 * 60 * 1000, // 15 minutes default
      maxQueries: config.maxQueries ?? 500,
      cacheProvider: config.cacheProvider ?? getCacheService(),
      useLlmNormalization: config.useLlmNormalization ?? true, // Enable by default
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
    const normalizedQuery = await this._getNormalizedQuery(query);
    const normalizedKey = context ? `${normalizedQuery}|${context}` : normalizedQuery;
    const hash = this.queryIndex.get(normalizedKey);
    const analytics = getCacheAnalyticsService();

    if (!hash) {
      const latency = Date.now() - startTime;
      analytics.recordCacheMiss(query, latency);

      if (traceContext) {
        recordSpan(
          "semantic-cache-miss",
          "cache",
          traceContext,
          { query: query.slice(0, 100), normalizedKey },
          { cacheHit: false, latencyMs: latency },
        );
      }

      logger.debug("Semantic cache miss (no normalized match)", { query: query.slice(0, 50) });
      return null;
    }

    const cacheKey = this.buildCacheKey(hash);
    const result = this.config.cacheProvider.get<SemanticCacheEntry>(cacheKey);
    const entry = result instanceof Promise ? await result : result;

    if (!entry) {
      this.queryIndex.delete(normalizedKey);
      const latency = Date.now() - startTime;
      analytics.recordCacheMiss(query, latency);

      if (traceContext) {
        recordSpan(
          "semantic-cache-miss",
          "cache",
          traceContext,
          { query: query.slice(0, 100), reason: "stale_entry" },
          { cacheHit: false, latencyMs: latency },
        );
      }
      return null;
    }

    entry.hitCount++;
    const setResult = this.config.cacheProvider.set(cacheKey, entry, this.config.ttlMs);
    if (setResult instanceof Promise) {
      await setResult;
    }

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

    // Evict old entries if at capacity
    if (this.queryIndex.size >= this.config.maxQueries) {
      this.evictOldest();
    }

    const entry: SemanticCacheEntry = {
      query,
      queryHash: hash,
      response,
      timestamp: Date.now(),
      hitCount: 0,
    };

    const cacheKey = this.buildCacheKey(hash);
    this.queryIndex.set(normalizedKey, hash);

    const setResult = this.config.cacheProvider.set(cacheKey, entry, this.config.ttlMs);
    if (setResult instanceof Promise) {
      await setResult;
    }

    logger.debug("Semantic cache set", { query: query.slice(0, 50), hash });
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
      // Qualifiers that don't change core intent
      "favorite",
      "favourite",
      "recent",
      "latest",
      "top",
      "best",
      "all",
      "some",
      "few",
      // Filler words
      "just",
      "only",
      "basically",
      "actually",
      "really",
      "simply",
      // Time-related (handled by temporal filters elsewhere)
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
    logger.debug("Query normalization (fallback)", { original: query.slice(0, 50), normalized });

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

  private evictOldest(): void {
    const iterator = this.queryIndex.keys();
    const oldest = iterator.next().value;
    if (oldest) {
      const hash = this.queryIndex.get(oldest);
      this.queryIndex.delete(oldest);
      if (hash) {
        const cacheKey = this.buildCacheKey(hash);
        this.config.cacheProvider.delete(cacheKey);
      }
    }
  }

  async clear(): Promise<void> {
    for (const hash of this.queryIndex.values()) {
      const cacheKey = this.buildCacheKey(hash);
      const result = this.config.cacheProvider.delete(cacheKey);
      if (result instanceof Promise) {
        await result;
      }
    }
    this.queryIndex.clear();
  }

  getStats(): { entryCount: number; maxQueries: number } {
    return {
      entryCount: this.queryIndex.size,
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
