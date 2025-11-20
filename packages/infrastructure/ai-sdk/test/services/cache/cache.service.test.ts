import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert";
import { CacheService, resetCacheService } from "../../../src/services/cache/cache.service";
import {
  getCacheAnalyticsService,
  resetCacheAnalyticsService,
} from "../../../src/services/analytics/cache-analytics.service";

describe("CacheService", () => {
  beforeEach(() => {
    resetCacheService();
    resetCacheAnalyticsService();
  });

  it("should store and retrieve values", () => {
    const cache = new CacheService();
    cache.set("key1", "value1");
    assert.strictEqual(cache.get("key1"), "value1");
  });

  it("should return null for missing keys", () => {
    const cache = new CacheService();
    assert.strictEqual(cache.get("missing"), null);
  });

  it("should respect TTL", async () => {
    const cache = new CacheService({ ttlMs: 10 });
    cache.set("key1", "value1");
    assert.strictEqual(cache.get("key1"), "value1");

    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(cache.get("key1"), null);
  });

  it("should evict oldest item when full (LRU)", () => {
    const cache = new CacheService({ maxItems: 2 });

    cache.set("key1", "value1");
    cache.set("key2", "value2");

    // Access key1 to make it recently used
    cache.get("key1");

    // Add key3, should evict key2 (least recently used)
    cache.set("key3", "value3");

    assert.strictEqual(cache.get("key1"), "value1");
    assert.strictEqual(cache.get("key3"), "value3");
    assert.strictEqual(cache.get("key2"), null);
  });

  it("should update analytics stats", () => {
    const analytics = getCacheAnalyticsService();
    const updateSpy = mock.method(analytics, "updateCacheStats");

    const cache = new CacheService();
    cache.set("key1", "value1");

    assert.strictEqual(updateSpy.mock.callCount(), 2); // Init + Set
    const lastCall = updateSpy.mock.calls[1].arguments[0];
    assert.strictEqual(lastCall.entryCount, 1);
  });

  it("should record eviction in analytics", () => {
    const analytics = getCacheAnalyticsService();
    const evictionSpy = mock.method(analytics, "recordEviction");

    const cache = new CacheService({ maxItems: 1 });
    cache.set("key1", "value1");
    cache.set("key2", "value2"); // Triggers eviction

    assert.strictEqual(evictionSpy.mock.callCount(), 1);
  });
});
