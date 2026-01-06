import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RetrievedDocument } from "../../../src/rag/retrieve";
import { ContextPreprocessorService } from "../../../src/services/context/context-preprocessor.service";

function createMockDocument(id: string, startTime: Date, content = "Test content"): RetrievedDocument {
  return {
    id,
    content,
    score: 0.5,
    collection: "test_collection",
    metadata: {
      startTime: startTime.toISOString(),
    },
  };
}

describe("ContextPreprocessorService", () => {
  describe("detectTemporalIntent", () => {
    it("should detect 'future' intent from query", () => {
      const service = new ContextPreprocessorService();

      const futureQueries = [
        "upcoming meetings",
        "What are my next appointments",
        "scheduled events for tomorrow",
        "my future calendar",
      ];

      for (const query of futureQueries) {
        const result = service.detectTemporalIntent(query);
        assert.equal(result, "future", `Should detect 'future' for: ${query}`);
      }
    });

    it("should detect 'past' intent from query", () => {
      const service = new ContextPreprocessorService();

      const pastQueries = [
        "what did I do last week",
        "previous meetings",
        "what happened yesterday",
        "my past events",
        "history of appointments",
      ];

      for (const query of pastQueries) {
        const result = service.detectTemporalIntent(query);
        assert.equal(result, "past", `Should detect 'past' for: ${query}`);
      }
    });

    it("should detect 'today' intent from query", () => {
      const service = new ContextPreprocessorService();

      const todayQueries = ["what do I have today", "current meetings", "meetings now"];

      for (const query of todayQueries) {
        const result = service.detectTemporalIntent(query);
        assert.equal(result, "today", `Should detect 'today' for: ${query}`);
      }
    });

    it("should return 'all' for queries without temporal intent", () => {
      const service = new ContextPreprocessorService();

      const genericQueries = ["show me my calendar", "list events", "meetings with John"];

      for (const query of genericQueries) {
        const result = service.detectTemporalIntent(query);
        assert.equal(result, "all", `Should detect 'all' for: ${query}`);
      }
    });
  });

  describe("filter", () => {
    it("should filter out past documents when intent is 'future'", () => {
      const service = new ContextPreprocessorService();
      const now = new Date();

      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 7); // 7 days ahead

      const documents: RetrievedDocument[] = [
        createMockDocument("past-event", pastDate),
        createMockDocument("future-event", futureDate),
      ];

      const result = service.filter({
        documents,
        query: "upcoming meetings",
      });

      assert.equal(result.documents.length, 1, "Should keep only 1 document");
      assert.equal(result.documents[0]?.id, "future-event", "Should keep future event");
      assert.equal(result.filtered, 1, "Should have filtered 1 document");
      assert.equal(result.temporalIntent, "future", "Should detect future intent");
    });

    it("should filter out future documents when intent is 'past'", () => {
      const service = new ContextPreprocessorService();
      const now = new Date();

      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - 7);

      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 7);

      const documents: RetrievedDocument[] = [
        createMockDocument("past-event", pastDate),
        createMockDocument("future-event", futureDate),
      ];

      const result = service.filter({
        documents,
        query: "what did I do last week",
      });

      assert.equal(result.documents.length, 1, "Should keep only 1 document");
      assert.equal(result.documents[0]?.id, "past-event", "Should keep past event");
      assert.equal(result.filtered, 1, "Should have filtered 1 document");
      assert.equal(result.temporalIntent, "past", "Should detect past intent");
    });

    it("should keep all documents when intent is 'all'", () => {
      const service = new ContextPreprocessorService();
      const now = new Date();

      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - 7);

      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + 7);

      const documents: RetrievedDocument[] = [
        createMockDocument("past-event", pastDate),
        createMockDocument("future-event", futureDate),
      ];

      const result = service.filter({
        documents,
        query: "show me my calendar",
      });

      assert.equal(result.documents.length, 2, "Should keep all documents");
      assert.equal(result.filtered, 0, "Should have filtered 0 documents");
      assert.equal(result.temporalIntent, "all", "Should detect all intent");
    });

    it("should keep documents without dates regardless of intent", () => {
      const service = new ContextPreprocessorService();

      const docWithoutDate: RetrievedDocument = {
        id: "no-date",
        content: "Test content",
        score: 0.5,
        collection: "test_collection",
        metadata: {}, // No date field
      };

      const result = service.filter({
        documents: [docWithoutDate],
        query: "upcoming meetings",
        temporalIntent: "future",
      });

      assert.equal(result.documents.length, 1, "Should keep document without date");
      assert.equal(result.filtered, 0, "Should not filter document without date");
    });
  });
});
