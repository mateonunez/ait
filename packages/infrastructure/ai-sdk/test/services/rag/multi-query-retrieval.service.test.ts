import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import sinon from "sinon";
import type { QdrantProvider } from "../../../src/services/rag/qdrant.provider";
import { MultiQueryRetrievalService } from "../../../src/services/retrieval/multi-query-retrieval.service";
import type { BaseMetadata, Document } from "../../../src/types/documents";

describe("MultiQueryRetrievalService", () => {
  let service: MultiQueryRetrievalService;
  let mockVectorStore: sinon.SinonStubbedInstance<QdrantProvider>;

  const createMockDoc = (id: string, content: string): Document<BaseMetadata> => ({
    pageContent: content,
    metadata: { id, __type: "test" },
  });

  beforeEach(() => {
    mockVectorStore = {
      similaritySearchWithScore: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<QdrantProvider>;

    service = new MultiQueryRetrievalService({
      maxDocs: 10,
      concurrency: 2,
    });
  });

  describe("retrieve", () => {
    it("should execute vector search with provided query", async () => {
      const doc1 = createMockDoc("doc1", "content 1");
      const doc2 = createMockDoc("doc2", "content 2");

      mockVectorStore.similaritySearchWithScore.resolves([
        [doc1, 0.9],
        [doc2, 0.8],
      ]);

      const result = await service.retrieve(mockVectorStore, "test query");

      assert.ok(mockVectorStore.similaritySearchWithScore.called);
      assert.equal(result.length, 1); // One query result
      assert.equal(result[0].results.length, 2); // Two documents
    });

    it("should pass type filter to vector store", async () => {
      const doc = createMockDoc("doc1", "content");
      mockVectorStore.similaritySearchWithScore.resolves([[doc, 0.9]]);

      const typeFilter = { types: ["github_commit"] };
      await service.retrieve(mockVectorStore, "github repos", typeFilter);

      const callArgs = mockVectorStore.similaritySearchWithScore.firstCall.args;
      assert.deepEqual(callArgs[2], typeFilter);
    });

    it("should return empty results when no documents found", async () => {
      mockVectorStore.similaritySearchWithScore.resolves([]);

      const result = await service.retrieve(mockVectorStore, "test");

      assert.equal(result.length, 1);
      assert.equal(result[0].results.length, 0);
    });

    it("should handle query failures gracefully", async () => {
      mockVectorStore.similaritySearchWithScore.rejects(new Error("Query failed"));

      const result = await service.retrieve(mockVectorStore, "test");

      // Should return empty results, not throw
      assert.equal(result.length, 0);
    });
  });

  describe("configuration", () => {
    it("should use default configuration", () => {
      const defaultService = new MultiQueryRetrievalService();
      assert.ok(defaultService);
    });

    it("should accept custom configuration", () => {
      const customService = new MultiQueryRetrievalService({
        maxDocs: 50,
        concurrency: 4,
        scoreThreshold: 0.5,
      });
      assert.ok(customService);
    });

    it("should clamp concurrency to 1-8 range", () => {
      const serviceLow = new MultiQueryRetrievalService({ concurrency: 0 });
      const serviceHigh = new MultiQueryRetrievalService({ concurrency: 20 });

      assert.ok(serviceLow);
      assert.ok(serviceHigh);
    });
  });
});
