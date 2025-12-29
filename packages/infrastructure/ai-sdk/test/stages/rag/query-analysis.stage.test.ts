import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EntityType } from "@ait/core";
import type { PipelineContext } from "../../../src/services/rag/pipeline/pipeline.types";
import type { IQueryIntentService, QueryIntent } from "../../../src/services/routing/query-intent.service";
import { QueryAnalysisStage } from "../../../src/stages/rag/query-analysis.stage";
import type { QueryAnalysisInput } from "../../../src/types/stages";

/**
 * Creates a mock QueryIntentService that returns predictable results
 * based on query patterns - avoids actual LLM calls during tests.
 */
function createMockIntentService(): IQueryIntentService {
  return {
    analyzeIntent: async (query: string): Promise<QueryIntent> => {
      const lowerQuery = query.toLowerCase();

      // Temporal patterns
      const isTemporalQuery = /\b(yesterday|last\s+week|today|recent|ago)\b/i.test(query);
      const timeReference = isTemporalQuery ? "yesterday" : undefined;

      // Entity detection patterns
      const entityTypes: EntityType[] = [];
      if (/github|commits?|pull\s*requests?|pr/i.test(lowerQuery)) entityTypes.push("github_file");
      if (/spotify|playlist|song|music/i.test(lowerQuery)) entityTypes.push("spotify_track");
      if (/slack|message/i.test(lowerQuery)) entityTypes.push("slack_message");
      if (/calendar|event|meeting/i.test(lowerQuery)) entityTypes.push("google_calendar_event");

      // Greeting detection
      const isGreeting = /^(hi|hello|hey|ciao|hola|bonjour)[!,.\s]*/i.test(query);

      // Complexity based on query structure
      const wordCount = query.split(/\s+/).length;
      const hasCompareOrCorrelate = /compare|correlations?|analyze/i.test(lowerQuery);
      const complexityScore = hasCompareOrCorrelate ? 8 : wordCount > 10 ? 6 : 3;

      return {
        entityTypes,
        isTemporalQuery,
        timeReference,
        primaryFocus: query.slice(0, 50),
        complexityScore,
        requiredStyle: "concise",
        topicShift: false,
        needsRAG: !isGreeting, // Only greetings skip RAG; broad queries still need RAG
        needsTools: false,
      };
    },
  };
}

describe("QueryAnalysisStage", () => {
  function createMockContext(): PipelineContext {
    return {
      metadata: {},
      state: new Map<string, unknown>(),
      telemetry: {
        recordStage: () => {},
      },
    };
  }

  function createStageWithMock(): QueryAnalysisStage {
    return new QueryAnalysisStage(undefined, createMockIntentService());
  }

  describe("execute", () => {
    it("should analyze a simple query and return analysis output", async () => {
      const stage = createStageWithMock();
      const input: QueryAnalysisInput = {
        query: "What are my recent GitHub commits?",
      };

      const result = await stage.execute(input, createMockContext());

      assert.ok(result.query, "Should have a query");
      assert.ok(result.intent, "Should have intent");
      assert.ok("needsRAG" in result, "Should have needsRAG flag");
      assert.ok(result.routingResult, "Should have routing result");
    });

    it("should detect entity types from query", async () => {
      const stage = createStageWithMock();
      const input: QueryAnalysisInput = {
        query: "Show me my Spotify playlists",
      };

      const result = await stage.execute(input, createMockContext());

      assert.ok(result.intent.entityTypes.length > 0, "Should detect entity types");
    });

    it("should detect temporal queries", async () => {
      const stage = createStageWithMock();
      const input: QueryAnalysisInput = {
        query: "What did I do yesterday?",
      };

      const result = await stage.execute(input, createMockContext());

      assert.equal(result.intent.isTemporalQuery, true, "Should detect temporal query");
    });

    it("should pass through trace context", async () => {
      const stage = createStageWithMock();
      const traceContext = { traceId: "test-trace-123" };
      const input: QueryAnalysisInput = {
        query: "Test query",
        traceContext,
      };

      const result = await stage.execute(input, createMockContext());

      assert.deepEqual(result.traceContext, traceContext, "Should preserve trace context");
    });

    it("should handle broad queries by routing to all collections", async () => {
      const stage = createStageWithMock();
      const input: QueryAnalysisInput = {
        query: "What's new?",
      };

      const result = await stage.execute(input, createMockContext());

      assert.ok(result.routingResult, "Should have routing result");
      assert.ok(
        result.routingResult.strategy === "all-collections" || result.routingResult.selectedCollections.length > 1,
        "Should route to multiple collections for broad query",
      );
    });

    it("should determine fast path for simple queries", async () => {
      const stage = createStageWithMock();
      const input: QueryAnalysisInput = {
        query: "Hello, AIt!", // Greeting - should skip RAG
      };

      const result = await stage.execute(input, createMockContext());

      // Greetings should skip RAG (fast path = true, needsRAG = false)
      assert.equal(result.needsRAG, false, "Greeting should use fast path (needsRAG=false)");
      assert.equal(result.intent.needsRAG, false, "Greeting should not need RAG");
    });

    it("should not use fast path for complex queries", async () => {
      const stage = createStageWithMock();
      const input: QueryAnalysisInput = {
        query: "Compare my GitHub activity with Slack messages from last week and find correlations",
      };

      const result = await stage.execute(input, createMockContext());

      // Complex multi-entity temporal queries should not use fast path
      if (result.intent.entityTypes.length > 1 || result.intent.isTemporalQuery) {
        assert.equal(result.needsRAG, true, "Complex query should not use fast path (needsRAG=true)");
      }
    });
  });

  describe("stage properties", () => {
    it("should have correct stage name", () => {
      const stage = createStageWithMock();
      assert.equal(stage.name, "query-analysis");
    });
  });
});
