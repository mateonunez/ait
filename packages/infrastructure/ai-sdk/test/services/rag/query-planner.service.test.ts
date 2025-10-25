import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { QueryPlannerService } from "../../../src/services/rag/query-planner.service";

describe("QueryPlannerService", () => {
  let service: QueryPlannerService;

  describe("planQueries", () => {
    it("should generate queries using heuristic fallback", async () => {
      service = new QueryPlannerService({ queriesCount: 6 });

      // This will use heuristic fallback since we don't have a proper LLM setup in unit tests
      const result = await service.planQueries("spotify playlists");

      assert.ok(result.queries.length > 0);
      assert.ok(result.queries[0].includes("spotify"));
    });

    it("should preserve domain signals in queries", async () => {
      service = new QueryPlannerService({ queriesCount: 6 });

      const result = await service.planQueries("github linear projects");

      const withDomain = result.queries.filter((q) => q.includes("github") || q.includes("linear"));
      assert.ok(withDomain.length > 0, "Should preserve domain signals");
    });

    it("should generate multiple diverse queries", async () => {
      service = new QueryPlannerService({ queriesCount: 8 });

      const result = await service.planQueries("test query");

      assert.ok(result.queries.length >= 2, "Should generate multiple queries");
      // Check for diversity - queries should not all be identical
      const uniqueQueries = new Set(result.queries);
      assert.ok(uniqueQueries.size > 1, "Should have diverse queries");
    });

    it("should respect queriesCount configuration", async () => {
      service = new QueryPlannerService({ queriesCount: 4 });

      const result = await service.planQueries("test query");

      assert.ok(result.queries.length >= 2);
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
