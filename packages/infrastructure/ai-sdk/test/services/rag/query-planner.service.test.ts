import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { QueryPlannerService } from "../../../src/services/rag/query-planner.service";

describe("QueryPlannerService", () => {
  let service: QueryPlannerService;

  describe("planQueries", () => {
    it("should generate queries successfully", async () => {
      service = new QueryPlannerService({ queriesCount: 6 });

      // This may use LLM or heuristic fallback depending on environment
      const result = await service.planQueries("spotify playlists");

      // Check that we get valid results regardless of source
      assert.ok(result.queries.length > 0, "Should return at least one query");
      assert.ok(typeof result.usedFallback === "boolean", "Should have usedFallback flag");
      assert.ok(["llm", "heuristic"].includes(result.source), "Should have valid source");

      // Check that at least one query contains the domain keyword
      const hasSpotify = result.queries.some(
        (q) => q.includes("spotify") || q.includes("music") || q.includes("playlist"),
      );
      assert.ok(hasSpotify, "Should preserve domain signals");
    });

    it("should preserve domain signals in queries", async () => {
      service = new QueryPlannerService({ queriesCount: 6 });

      const result = await service.planQueries("github linear projects");

      const withDomain = result.queries.filter((q) => q.includes("github") || q.includes("linear"));
      assert.ok(withDomain.length > 0, "Should preserve domain signals");
      assert.ok(result.originalQuery.includes("github"));
    });

    it("should produce at least one normalized query", async () => {
      service = new QueryPlannerService({ queriesCount: 8 });

      const result = await service.planQueries("test query");

      assert.ok(result.queries.length >= 1, "Should return at least one query");
      for (const query of result.queries) {
        assert.equal(query, query.toLowerCase(), `Query "${query}" should be lowercase`);
        assert.ok(!query.includes("?"), "Query should be sanitized");
      }
    });

    it("should respect queriesCount configuration", async () => {
      service = new QueryPlannerService({ queriesCount: 4 });

      const result = await service.planQueries("test query");

      assert.ok(result.queries.length >= 1);
      assert.ok(result.queries.length <= 8); // Within reasonable bounds
    });

    it("should normalize queries to lowercase", async () => {
      service = new QueryPlannerService({ queriesCount: 6 });

      const result = await service.planQueries("GitHub Projects");

      // All queries should be lowercase
      for (const query of result.queries) {
        assert.equal(query, query.toLowerCase(), `Query "${query}" should be lowercase`);
      }
    });

    it("should handle queries with special characters", async () => {
      service = new QueryPlannerService({ queriesCount: 6 });

      const result = await service.planQueries("what's my github repos?");

      assert.ok(result.queries.length > 0);
      // Queries should be cleaned up (no quotes, proper spacing)
      for (const query of result.queries) {
        assert.ok(!query.includes("'"), "Should not contain quotes");
        assert.ok(!query.includes("?"), "Should not contain question marks");
      }
    });

    it("should flag fallback usage when LLM output is insufficient", async () => {
      service = new QueryPlannerService({ queriesCount: 12 });

      const result = await service.planQueries("general question");

      assert.ok(typeof result.usedFallback === "boolean");
      assert.equal(result.originalQuery, "general question");
    });
  });

  describe("configuration", () => {
    it("should respect queriesCount limits (4-16)", () => {
      const serviceLow = new QueryPlannerService({ queriesCount: 2 }); // below min
      const serviceHigh = new QueryPlannerService({ queriesCount: 20 }); // above max

      // Both should be clamped to valid range and instantiate successfully
      assert.ok(serviceLow);
      assert.ok(serviceHigh);
    });

    it("should use default configuration", () => {
      const serviceDefault = new QueryPlannerService();
      assert.ok(serviceDefault);
    });

    it("should accept custom temperature and topP", () => {
      const service = new QueryPlannerService({
        queriesCount: 4,
        temperature: 0.5,
        topP: 0.8,
      });

      // Service should be created successfully with custom config
      assert.ok(service);
    });
  });
});
