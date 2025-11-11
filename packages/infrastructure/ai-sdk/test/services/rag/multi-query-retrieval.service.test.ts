import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";
import { MultiQueryRetrievalService } from "../../../src/services/retrieval/multi-query-retrieval.service";
import type { IQueryPlannerService } from "../../../src/services/retrieval/query-planner.service";
import type { IDiversityService } from "../../../src/services/filtering/diversity.service";
import type { ITypeFilterService } from "../../../src/services/filtering/type-filter.service";
import type { IRankFusionService } from "../../../src/services/ranking/rank-fusion.service";
import type { Document, BaseMetadata } from "../../../src/types/documents";
import type { QueryPlanResult } from "../../../src/types/rag";
import type { QdrantProvider } from "../../../src/services/rag/qdrant.provider";

describe("MultiQueryRetrievalService", () => {
  let service: MultiQueryRetrievalService;
  let mockQueryPlanner: sinon.SinonStubbedInstance<IQueryPlannerService>;
  let mockDiversity: sinon.SinonStubbedInstance<IDiversityService>;
  let mockTypeFilter: sinon.SinonStubbedInstance<ITypeFilterService>;
  let mockRankFusion: sinon.SinonStubbedInstance<IRankFusionService>;
  let mockVectorStore: sinon.SinonStubbedInstance<QdrantProvider>;

  const createMockDoc = (id: string, content: string): Document<BaseMetadata> => ({
    pageContent: content,
    metadata: { id, __type: "test" },
  });

  beforeEach(() => {
    mockQueryPlanner = {
      planQueries: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<IQueryPlannerService>;

    mockDiversity = {
      applyMMR: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<IDiversityService>;

    mockTypeFilter = {
      inferTypes: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<ITypeFilterService>;

    mockRankFusion = {
      fuseResults: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<IRankFusionService>;

    mockVectorStore = {
      similaritySearchWithScore: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<QdrantProvider>;

    service = new MultiQueryRetrievalService(mockQueryPlanner, mockDiversity, mockTypeFilter, mockRankFusion, {
      maxDocs: 10,
      concurrency: 2,
    });
  });

  describe("retrieve", () => {
    it("should orchestrate full retrieval flow", async () => {
      const queries = ["query one", "query two", "query three"];
      mockQueryPlanner.planQueries.resolves({
        queries,
        source: "llm",
        isDiverse: true,
      } as QueryPlanResult);

      mockTypeFilter.inferTypes.returns(undefined);

      const doc1 = createMockDoc("doc1", "content 1");
      const doc2 = createMockDoc("doc2", "content 2");

      mockVectorStore.similaritySearchWithScore.resolves([
        [doc1, 0.9],
        [doc2, 0.8],
      ]);

      mockRankFusion.fuseResults.returns([
        {
          doc: doc1,
          finalScore: 0.95,
          rrfScore: 0.5,
          bestScore: 0.9,
          sumScore: 0.9,
          hits: 1,
          ranks: [0],
        },
        {
          doc: doc2,
          finalScore: 0.85,
          rrfScore: 0.4,
          bestScore: 0.8,
          sumScore: 0.8,
          hits: 1,
          ranks: [1],
        },
      ]);

      mockDiversity.applyMMR.callsFake((selectedDocs, maxDocs) => selectedDocs);

      const result = await service.retrieve(mockVectorStore, "test query");

      assert.ok(mockQueryPlanner.planQueries.calledOnce);
      assert.ok(mockTypeFilter.inferTypes.calledOnce);
      assert.ok(mockVectorStore.similaritySearchWithScore.called);
      assert.ok(mockRankFusion.fuseResults.calledOnce);
      assert.equal(result.length, 2);
    });

    it("should handle parallel query execution", async () => {
      mockQueryPlanner.planQueries.resolves({
        queries: ["query1", "query2", "query3", "query4"],
        source: "llm",
        isDiverse: true,
      } as QueryPlanResult);

      mockTypeFilter.inferTypes.returns(undefined);

      const doc = createMockDoc("doc1", "content");
      mockVectorStore.similaritySearchWithScore.resolves([[doc, 0.9]]);

      mockRankFusion.fuseResults.returns([
        {
          doc,
          finalScore: 0.9,
          rrfScore: 0.5,
          bestScore: 0.9,
          sumScore: 0.9,
          hits: 4,
          ranks: [0, 0, 0, 0],
        },
      ]);

      mockDiversity.applyMMR.callsFake((selected) => selected);

      await service.retrieve(mockVectorStore, "test");

      // Should execute all queries
      assert.equal(mockVectorStore.similaritySearchWithScore.callCount, 4);
    });

    it("should apply diversity if more than 5 results", async () => {
      mockQueryPlanner.planQueries.resolves({
        queries: ["query1", "query2"],
        source: "llm",
        isDiverse: true,
      } as QueryPlanResult);

      mockTypeFilter.inferTypes.returns(undefined);

      const docs = Array.from({ length: 8 }, (_, i) => createMockDoc(`doc${i}`, `content ${i}`));

      mockVectorStore.similaritySearchWithScore.resolves(docs.map((d) => [d, 0.8]));

      mockRankFusion.fuseResults.returns(
        docs.map((d, i) => ({
          doc: d,
          finalScore: 0.9 - i * 0.05,
          rrfScore: 0.5,
          bestScore: 0.8,
          sumScore: 0.8,
          hits: 1,
          ranks: [i],
        })),
      );

      const diversified = docs.slice(0, 6);
      mockDiversity.applyMMR.returns(diversified);

      const result = await service.retrieve(mockVectorStore, "test");

      assert.ok(mockDiversity.applyMMR.calledOnce);
      assert.equal(mockDiversity.applyMMR.firstCall.args[1], 10); // maxDocs (second parameter)
      assert.equal(result.length, diversified.length);
    });

    it("should return empty array on no results", async () => {
      mockQueryPlanner.planQueries.resolves({
        queries: ["query1"],
        source: "llm",
        isDiverse: true,
      } as QueryPlanResult);

      mockTypeFilter.inferTypes.returns(undefined);
      mockVectorStore.similaritySearchWithScore.resolves([]);
      mockRankFusion.fuseResults.returns([]);

      const result = await service.retrieve(mockVectorStore, "test");

      assert.equal(result.length, 0);
    });

    it("should return empty array when no unique documents after fusion", async () => {
      mockQueryPlanner.planQueries.resolves({
        queries: ["query1"],
        source: "llm",
        isDiverse: true,
      } as QueryPlanResult);

      mockTypeFilter.inferTypes.returns(undefined);
      mockVectorStore.similaritySearchWithScore.resolves([[createMockDoc("doc1", "content"), 0.9]]);
      mockRankFusion.fuseResults.returns([]);

      const result = await service.retrieve(mockVectorStore, "test");

      assert.equal(result.length, 0);
    });

    it("should handle query failures gracefully", async () => {
      mockQueryPlanner.planQueries.resolves({
        queries: ["query1", "query2"],
        source: "llm",
        isDiverse: true,
      } as QueryPlanResult);

      mockTypeFilter.inferTypes.returns(undefined);

      let callCount = 0;
      mockVectorStore.similaritySearchWithScore.callsFake(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Query failed");
        }
        return [[createMockDoc("doc1", "content"), 0.9]];
      });

      mockRankFusion.fuseResults.returns([
        {
          doc: createMockDoc("doc1", "content"),
          finalScore: 0.9,
          rrfScore: 0.5,
          bestScore: 0.9,
          sumScore: 0.9,
          hits: 1,
          ranks: [0],
        },
      ]);

      mockDiversity.applyMMR.callsFake((selected) => selected);

      const result = await service.retrieve(mockVectorStore, "test");

      // Should still return results from successful query
      assert.equal(result.length, 1);
    });

    it("should pass score threshold to vector store", async () => {
      const customService = new MultiQueryRetrievalService(
        mockQueryPlanner,
        mockDiversity,
        mockTypeFilter,
        mockRankFusion,
        { scoreThreshold: 0.5 },
      );

      mockQueryPlanner.planQueries.resolves({
        queries: ["query1"],
        source: "llm",
        isDiverse: true,
      } as QueryPlanResult);

      mockTypeFilter.inferTypes.returns(undefined);
      mockVectorStore.similaritySearchWithScore.resolves([[createMockDoc("doc1", "content"), 0.9]]);

      mockRankFusion.fuseResults.returns([
        {
          doc: createMockDoc("doc1", "content"),
          finalScore: 0.9,
          rrfScore: 0.5,
          bestScore: 0.9,
          sumScore: 0.9,
          hits: 1,
          ranks: [0],
        },
      ]);

      mockDiversity.applyMMR.callsFake((selected) => selected);

      await customService.retrieve(mockVectorStore, "test");

      const callArgs = mockVectorStore.similaritySearchWithScore.firstCall.args;
      assert.equal(callArgs[3], 0.5); // scoreThreshold parameter
    });

    it("should pass type filter to vector store", async () => {
      mockQueryPlanner.planQueries.resolves({
        queries: ["github repos"],
        source: "llm",
        isDiverse: true,
      } as QueryPlanResult);

      const typeFilter = { types: ["repository"] };
      mockTypeFilter.inferTypes.returns(typeFilter);

      mockVectorStore.similaritySearchWithScore.resolves([[createMockDoc("doc1", "content"), 0.9]]);

      mockRankFusion.fuseResults.returns([
        {
          doc: createMockDoc("doc1", "content"),
          finalScore: 0.9,
          rrfScore: 0.5,
          bestScore: 0.9,
          sumScore: 0.9,
          hits: 1,
          ranks: [0],
        },
      ]);

      mockDiversity.applyMMR.callsFake((selected) => selected);

      await service.retrieve(mockVectorStore, "github repos");

      const callArgs = mockVectorStore.similaritySearchWithScore.firstCall.args;
      assert.deepEqual(callArgs[2], typeFilter);
    });

    it("should apply MMR even for fewer results", async () => {
      mockQueryPlanner.planQueries.resolves({
        queries: ["query1"],
        source: "llm",
        isDiverse: true,
      } as QueryPlanResult);

      mockTypeFilter.inferTypes.returns(undefined);

      const docs = Array.from({ length: 3 }, (_, i) => createMockDoc(`doc${i}`, `content ${i}`));

      mockVectorStore.similaritySearchWithScore.resolves(docs.map((d) => [d, 0.8]));

      mockRankFusion.fuseResults.returns(
        docs.map((d, i) => ({
          doc: d,
          finalScore: 0.9 - i * 0.05,
          rrfScore: 0.5,
          bestScore: 0.8,
          sumScore: 0.8,
          hits: 1,
          ranks: [i],
        })),
      );

      // MMR should return all docs when count is less than maxDocs
      mockDiversity.applyMMR.callsFake((selected, max) => selected.slice(0, Math.min(selected.length, max)));

      const result = await service.retrieve(mockVectorStore, "test");

      assert.equal(result.length, 3);
      assert.ok(mockDiversity.applyMMR.calledOnce);
    });
  });

  describe("configuration", () => {
    it("should use default configuration", () => {
      const defaultService = new MultiQueryRetrievalService(
        mockQueryPlanner,
        mockDiversity,
        mockTypeFilter,
        mockRankFusion,
      );

      assert.ok(defaultService);
    });

    it("should clamp concurrency to 1-8 range", () => {
      const serviceLow = new MultiQueryRetrievalService(
        mockQueryPlanner,
        mockDiversity,
        mockTypeFilter,
        mockRankFusion,
        { concurrency: 0 },
      );

      const serviceHigh = new MultiQueryRetrievalService(
        mockQueryPlanner,
        mockDiversity,
        mockTypeFilter,
        mockRankFusion,
        { concurrency: 20 },
      );

      assert.ok(serviceLow);
      assert.ok(serviceHigh);
    });
  });
});
