import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SmartContextManager } from "../../../src/services/context/smart/smart-context.manager";
import type { Document } from "../../../src/types/documents";

const fakeTokenizer = {
  countTokens: (text: string) => text.length, // Simple mock: 1 char = 1 token
};

const fakeSummarizer = {
  summarize: async () => "Summarized",
};

describe("SmartContextManager", () => {
  let manager: SmartContextManager;

  const createMockDoc = (id: string, content: string): Document => ({
    pageContent: content,
    metadata: { id, title: `Doc ${id}`, __type: "document" },
  });

  const createManager = (limit: number) => {
    return new SmartContextManager(
      { totalTokenLimit: limit },
      {
        tokenizer: fakeTokenizer as any,
        summarizer: fakeSummarizer as any,
      },
    );
  };

  describe("Context Assembly", () => {
    it("should assemble context with system instructions", async () => {
      manager = createManager(1000);
      const context = await manager.assembleContext({
        systemInstructions: "System prompt",
      });
      assert.ok(context.includes("System prompt"));
    });

    it("should include retrieved documents", async () => {
      manager = createManager(1000);
      const docs = [createMockDoc("1", "Content 1")];
      const context = await manager.assembleContext({
        systemInstructions: "System",
        retrievedDocs: docs,
      });
      assert.ok(context.includes("Content 1"));
      assert.ok(context.includes("[Doc 1]"));
    });
  });

  describe("Deduplication", () => {
    it("should deduplicate documents with same ID", async () => {
      manager = createManager(1000);
      const docs = [createMockDoc("1", "Content 1"), createMockDoc("1", "Content 1 Dupe")];

      const context = await manager.assembleContext({
        systemInstructions: "System",
        retrievedDocs: docs,
      });

      const parts = context.split("[Doc 1]");
      assert.equal(parts.length, 2, "Document [Doc 1] should appear exactly once");
    });

    it("should deduplicate documents with identical content even if different IDs/no IDs", async () => {
      manager = createManager(1000);
      const docA: Document = { pageContent: "Same Content", metadata: { __type: "document" } as any };
      const docB: Document = { pageContent: "Same Content", metadata: { __type: "document" } as any };

      const context = await manager.assembleContext({
        systemInstructions: "System",
        retrievedDocs: [docA, docB],
      });

      const parts = context.split("Same Content");
      assert.equal(parts.length, 2, "Content should appear exactly once due to content hashing");
    });
  });

  describe("Pruning", () => {
    it("should prune RAG documents when exceeding budget", async () => {
      manager = createManager(150);
      const docs = [createMockDoc("1", "A".repeat(100)), createMockDoc("2", "B".repeat(100))];

      const context = await manager.assembleContext({
        systemInstructions: "System1234",
        retrievedDocs: docs,
      });

      assert.ok(context.includes("System"));

      manager = createManager(200);
      const context2 = await manager.assembleContext({
        systemInstructions: "System",
        retrievedDocs: [createMockDoc("1", "A".repeat(100)), createMockDoc("2", "B".repeat(100))],
      });

      const hasA = context2.includes("A".repeat(100));
      const hasB = context2.includes("B".repeat(100));

      assert.ok(hasA || hasB, "Should keep at least one document");
      assert.ok(!(hasA && hasB), "Should prune one document");
    });

    it("should enforce strict RAG token limit even if total budget allows", async () => {
      manager = new SmartContextManager(
        { totalTokenLimit: 2000, ragTokenLimit: 50 },
        {
          tokenizer: fakeTokenizer as any,
          summarizer: fakeSummarizer as any,
        },
      );

      const docs = [createMockDoc("1", "A".repeat(40)), createMockDoc("2", "B".repeat(30))];

      const context = await manager.assembleContext({
        systemInstructions: "System",
        retrievedDocs: docs,
      });

      const hasA = context.includes("A".repeat(40));
      const hasB = context.includes("B".repeat(30));

      assert.ok(hasA || hasB, "Should keep at least one");
      assert.ok(!(hasA && hasB), "Should prune one due to RAG limit");
    });
  });
});
