import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ScoredPointWithCollection } from "./retrieve.types";
import {
  applyCollectionWeights,
  buildCacheKey,
  createQdrantFilter,
  deduplicateResults,
  normalizeDate,
  rankAndLimit,
  stableStringify,
} from "./retrieve.utils";

describe("retrieve.utils", () => {
  describe("stableStringify", () => {
    it("should produce consistent output regardless of key order", () => {
      const obj1 = { b: 2, a: 1, c: 3 };
      const obj2 = { a: 1, c: 3, b: 2 };

      assert.equal(stableStringify(obj1), stableStringify(obj2));
    });

    it("should handle nested objects", () => {
      const obj1 = { outer: { b: 2, a: 1 }, z: "last" };
      const obj2 = { z: "last", outer: { a: 1, b: 2 } };

      assert.equal(stableStringify(obj1), stableStringify(obj2));
    });

    it("should convert Date objects to ISO strings", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const obj = { timestamp: date };

      const result = stableStringify(obj);
      assert.ok(result.includes("2024-01-15T10:30:00.000Z"));
    });

    it("should handle arrays", () => {
      const obj = { items: [3, 1, 2], name: "test" };
      const result = stableStringify(obj);

      // Arrays maintain their order (not sorted)
      assert.ok(result.includes("[3,1,2]"));
    });

    it("should handle null and undefined", () => {
      const obj = { a: null, b: undefined };
      const result = stableStringify(obj);

      assert.ok(result.includes('"a":null'));
    });
  });

  describe("normalizeDate", () => {
    it("should return undefined for undefined input", () => {
      assert.equal(normalizeDate(undefined), undefined);
    });

    it("should return string as-is", () => {
      const dateStr = "2024-01-15T10:30:00Z";
      assert.equal(normalizeDate(dateStr), dateStr);
    });

    it("should convert Date to ISO string", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      assert.equal(normalizeDate(date), "2024-01-15T10:30:00.000Z");
    });
  });

  describe("buildCacheKey", () => {
    it("should produce consistent keys for same options", () => {
      const options1 = {
        query: "test query",
        collections: ["col1", "col2"],
        types: ["type1"],
        scoreThreshold: 0.4,
      };

      const options2 = {
        query: "test query",
        collections: ["col2", "col1"], // Different order
        types: ["type1"],
        scoreThreshold: 0.4,
      };

      // Collections should be sorted, so keys should be identical
      assert.equal(buildCacheKey(options1), buildCacheKey(options2));
    });

    it("should include collectionWeights in key", () => {
      const options1 = {
        query: "test",
        collections: ["col1"],
        scoreThreshold: 0.4,
        collectionWeights: { col1: 2.0 },
      };

      const options2 = {
        query: "test",
        collections: ["col1"],
        scoreThreshold: 0.4,
      };

      assert.notEqual(buildCacheKey(options1), buildCacheKey(options2));
    });

    it("should include filter in key", () => {
      const options1 = {
        query: "test",
        collections: ["col1"],
        scoreThreshold: 0.4,
        filter: { fromDate: "2024-01-01" },
      };

      const options2 = {
        query: "test",
        collections: ["col1"],
        scoreThreshold: 0.4,
      };

      assert.notEqual(buildCacheKey(options1), buildCacheKey(options2));
    });
  });

  describe("createQdrantFilter", () => {
    it("should return undefined when no filter options provided", () => {
      const filter = createQdrantFilter({});
      assert.equal(filter, undefined);
    });

    it("should create temporal filter for fromDate", () => {
      const filter = createQdrantFilter({ fromDate: "2024-01-01" });

      assert.ok(filter);
      assert.ok(filter.must);
      assert.equal(filter.must.length, 1);
    });

    it("should create type filter for single type", () => {
      const filter = createQdrantFilter({ types: ["github_commit"] });

      assert.ok(filter);
      assert.ok(filter.must);
      const typeCondition = filter.must[0]!;
      assert.ok("key" in typeCondition);
      assert.equal((typeCondition as { key: string }).key, "metadata.__type");
    });

    it("should create should filter for multiple types", () => {
      const filter = createQdrantFilter({ types: ["github_commit", "spotify_track"] });

      assert.ok(filter);
      assert.ok(filter.must);
      const typeCondition = filter.must[0]!;
      assert.ok("should" in typeCondition);
    });

    it("should combine temporal and type filters", () => {
      const filter = createQdrantFilter({
        fromDate: "2024-01-01",
        toDate: "2024-12-31",
        types: ["github_commit"],
      });

      assert.ok(filter);
      assert.ok(filter.must);
      assert.equal(filter.must.length, 2);
    });
  });

  describe("applyCollectionWeights", () => {
    it("should return original points when no weights provided", () => {
      const points: ScoredPointWithCollection[] = [
        { id: "1", score: 0.9, collection: "col1" },
        { id: "2", score: 0.8, collection: "col2" },
      ];

      const result = applyCollectionWeights(points, undefined);
      assert.deepEqual(result, points);
    });

    it("should multiply scores by collection weights", () => {
      const points: ScoredPointWithCollection[] = [
        { id: "1", score: 0.5, collection: "col1" },
        { id: "2", score: 0.5, collection: "col2" },
      ];

      const weights = { col1: 2.0, col2: 1.0 };
      const result = applyCollectionWeights(points, weights);

      assert.equal(result[0]!.score, 1.0);
      assert.equal(result[1]!.score, 0.5);
    });

    it("should use default weight of 1.0 for unspecified collections", () => {
      const points: ScoredPointWithCollection[] = [{ id: "1", score: 0.5, collection: "unknown" }];

      const weights = { col1: 2.0 };
      const result = applyCollectionWeights(points, weights);

      assert.equal(result[0]!.score, 0.5);
    });
  });

  describe("deduplicateResults", () => {
    it("should remove duplicate documents by content", () => {
      const results = [
        { id: "1", payload: { content: "Hello world" }, score: 0.9 },
        { id: "2", payload: { content: "Hello world" }, score: 0.8 },
        { id: "3", payload: { content: "Different content" }, score: 0.7 },
      ];

      const { unique, duplicatesRemoved } = deduplicateResults(results);

      assert.equal(unique.length, 2);
      assert.equal(duplicatesRemoved, 1);
    });

    it("should keep document with higher score when duplicates found", () => {
      const results = [
        { id: "1", payload: { content: "Same content" }, score: 0.5 },
        { id: "2", payload: { content: "Same content" }, score: 0.9 },
      ];

      const { unique } = deduplicateResults(results);

      assert.equal(unique.length, 1);
      assert.equal(unique[0]!.id, "2");
      assert.equal(unique[0]!.score, 0.9);
    });

    it("should handle documents without content", () => {
      const results = [
        { id: "1", payload: {}, score: 0.9 },
        { id: "2", payload: undefined, score: 0.8 },
      ];

      const { unique, duplicatesRemoved } = deduplicateResults(results);

      assert.equal(unique.length, 2);
      assert.equal(duplicatesRemoved, 0);
    });
  });

  describe("rankAndLimit", () => {
    it("should sort by score descending", () => {
      const results = [
        { id: "1", score: 0.5 },
        { id: "2", score: 0.9 },
        { id: "3", score: 0.7 },
      ];

      const ranked = rankAndLimit(results, 10);

      assert.equal(ranked[0]!.id, "2");
      assert.equal(ranked[1]!.id, "3");
      assert.equal(ranked[2]!.id, "1");
    });

    it("should limit results", () => {
      const results = [
        { id: "1", score: 0.9 },
        { id: "2", score: 0.8 },
        { id: "3", score: 0.7 },
      ];

      const ranked = rankAndLimit(results, 2);

      assert.equal(ranked.length, 2);
    });

    it("should handle undefined scores", () => {
      const results = [{ id: "1", score: 0.5 }, { id: "2" }, { id: "3", score: 0.7 }];

      const ranked = rankAndLimit(results, 10);

      assert.equal(ranked[0]!.id, "3");
      assert.equal(ranked[1]!.id, "1");
      assert.equal(ranked[2]!.id, "2");
    });
  });
});
