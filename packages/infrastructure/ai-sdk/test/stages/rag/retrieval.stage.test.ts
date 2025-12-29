import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import type { MultiCollectionProvider } from "../../../src/services/rag/multi-collection.provider";
import type { PipelineContext } from "../../../src/services/rag/pipeline/pipeline.types";
import type { IMultiQueryRetrievalService } from "../../../src/services/retrieval/multi-query-retrieval.service";
import { RetrievalStage } from "../../../src/stages/rag/retrieval.stage";
import type { RetrievalInput } from "../../../src/types/stages";

describe("RetrievalStage", () => {
  function createMockContext(): PipelineContext {
    return {
      metadata: {},
      state: new Map<string, unknown>(),
      telemetry: {
        recordStage: () => {},
      },
    };
  }

  function createMockMultiQueryRetrieval(): IMultiQueryRetrievalService {
    return {
      retrieve: mock.fn(async () => []),
      retrieveAcrossCollections: mock.fn(async () => [
        {
          pageContent: "Test document content",
          metadata: {
            id: "doc-1",
            __type: "github_commit",
            collectionVendor: "github",
            score: 0.95,
          },
        },
        {
          pageContent: "Another document",
          metadata: {
            id: "doc-2",
            __type: "spotify_playlist",
            collectionVendor: "spotify",
            score: 0.85,
          },
        },
      ]),
    } as unknown as IMultiQueryRetrievalService;
  }

  function createMockMultiCollectionProvider(): MultiCollectionProvider {
    return {
      searchAcrossCollectionsWithScore: mock.fn(async () => []),
    } as unknown as MultiCollectionProvider;
  }

  describe("execute", () => {
    it("should retrieve documents from selected collections", async () => {
      const mockRetrieval = createMockMultiQueryRetrieval();
      const mockProvider = createMockMultiCollectionProvider();
      const stage = new RetrievalStage(mockRetrieval, mockProvider, false); // disable cache for testing

      const input: RetrievalInput = {
        query: "Test query",
        intent: {
          entityTypes: ["github_commit"],
          isTemporalQuery: false,
          primaryFocus: "github",
          complexityScore: 3,
          requiredStyle: "detailed",
          topicShift: false,
          needsRAG: false,
          needsTools: false,
        },
        needsRAG: false,
        routingResult: {
          selectedCollections: [{ vendor: "github", weight: 1.0 }],
          reasoning: "Entity-based routing",
          strategy: "single-collection",
          confidence: 0.9,
        },
      };

      const result = await stage.execute(input, createMockContext());

      assert.ok(result.documents, "Should have documents");
      assert.ok(Array.isArray(result.documents), "Documents should be an array");
      assert.ok(result.retrievalMetadata, "Should have retrieval metadata");
      assert.equal(typeof result.retrievalMetadata.totalDuration, "number", "Should have duration");
    });

    it("should preserve input properties in output", async () => {
      const mockRetrieval = createMockMultiQueryRetrieval();
      const mockProvider = createMockMultiCollectionProvider();
      const stage = new RetrievalStage(mockRetrieval, mockProvider, false);

      const input: RetrievalInput = {
        query: "Preserve this query",
        intent: {
          entityTypes: ["spotify_playlist"],
          isTemporalQuery: false,
          primaryFocus: "github",
          complexityScore: 2,
          requiredStyle: "detailed",
          topicShift: false,
          needsRAG: false,
          needsTools: false,
        },
        needsRAG: true,
        routingResult: {
          selectedCollections: [{ vendor: "spotify", weight: 1.0 }],
          reasoning: "Test routing",
          strategy: "single-collection",
          confidence: 0.9,
        },
      };

      const result = await stage.execute(input, createMockContext());

      assert.equal(result.query, input.query, "Should preserve query");
      assert.deepEqual(result.intent, input.intent, "Should preserve intent");
      assert.deepEqual(result.routingResult, input.routingResult, "Should preserve routing result");
    });

    it("should track documents per collection in metadata", async () => {
      const mockRetrieval = createMockMultiQueryRetrieval();
      const mockProvider = createMockMultiCollectionProvider();
      const stage = new RetrievalStage(mockRetrieval, mockProvider, false);

      const input: RetrievalInput = {
        query: "Multi collection query",
        intent: {
          entityTypes: ["github_commit", "spotify_playlist"],
          isTemporalQuery: false,
          primaryFocus: "github",
          complexityScore: 5,
          requiredStyle: "detailed",
          topicShift: false,
          needsRAG: false,
          needsTools: false,
        },
        needsRAG: false,
        routingResult: {
          selectedCollections: [
            { vendor: "github", weight: 1.0 },
            { vendor: "spotify", weight: 0.8 },
          ],
          reasoning: "Multi-entity routing",
          strategy: "multi-collection",
          confidence: 0.85,
        },
      };

      const result = await stage.execute(input, createMockContext());

      assert.ok(result.retrievalMetadata.documentsPerCollection, "Should have documents per collection");
      assert.ok(
        typeof result.retrievalMetadata.documentsPerCollection === "object",
        "Should be an object mapping vendors to counts",
      );
    });
  });

  describe("canExecute", () => {
    it("should return false for fast path queries", async () => {
      const mockRetrieval = createMockMultiQueryRetrieval();
      const mockProvider = createMockMultiCollectionProvider();
      const stage = new RetrievalStage(mockRetrieval, mockProvider, false);

      const input: RetrievalInput = {
        query: "Simple query",
        intent: {
          entityTypes: ["github_commit"],
          isTemporalQuery: false,
          primaryFocus: "github",
          complexityScore: 2,
          requiredStyle: "concise",
          topicShift: false,
          needsRAG: false,
          needsTools: false,
        },
        needsRAG: true, // Fast path enabled
        routingResult: {
          selectedCollections: [{ vendor: "github", weight: 1.0 }],
          reasoning: "Fast path",
          strategy: "single-collection",
          confidence: 0.9,
        },
      };

      const canExecute = await stage.canExecute(input);

      assert.equal(canExecute, false, "Should not execute for fast path queries");
    });

    it("should return true for non-fast-path queries", async () => {
      const mockRetrieval = createMockMultiQueryRetrieval();
      const mockProvider = createMockMultiCollectionProvider();
      const stage = new RetrievalStage(mockRetrieval, mockProvider, false);

      const input: RetrievalInput = {
        query: "Complex query",
        intent: {
          entityTypes: ["github_commit", "slack_message"],
          isTemporalQuery: true,
          primaryFocus: "github",
          complexityScore: 7,
          requiredStyle: "technical",
          topicShift: false,
          needsRAG: false,
          needsTools: false,
        },
        needsRAG: false, // Fast path disabled
        routingResult: {
          selectedCollections: [
            { vendor: "github", weight: 1.0 },
            { vendor: "slack", weight: 0.9 },
          ],
          reasoning: "Complex routing",
          strategy: "multi-collection",
          confidence: 0.8,
        },
      };

      const canExecute = await stage.canExecute(input);

      assert.equal(canExecute, true, "Should execute for non-fast-path queries");
    });
  });

  describe("stage properties", () => {
    it("should have correct stage name", () => {
      const mockRetrieval = createMockMultiQueryRetrieval();
      const mockProvider = createMockMultiCollectionProvider();
      const stage = new RetrievalStage(mockRetrieval, mockProvider);

      assert.equal(stage.name, "retrieval");
    });
  });
});
