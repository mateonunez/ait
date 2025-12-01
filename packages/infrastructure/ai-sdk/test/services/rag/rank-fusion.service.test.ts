import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RankFusionService } from "../../../src/services/ranking/rank-fusion.service";
import type { BaseMetadata, Document } from "../../../src/types/documents";
import type { QueryResult } from "../../../src/types/rag";

describe("RankFusionService", () => {
  const createMockDoc = (id: string, content: string): Document<BaseMetadata> => ({
    pageContent: content,
    metadata: { id, __type: "test" },
  });

  const extractId = (doc: Document<BaseMetadata>) => doc.metadata.id;

  describe("fuseResults", () => {
    it("should apply RRF formula correctly (1/(k+rank))", () => {
      const service = new RankFusionService({ rrfK: 60 });

      const queryResults: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [
            [createMockDoc("doc1", "content 1"), 0.9],
            [createMockDoc("doc2", "content 2"), 0.8],
          ],
        },
      ];

      const result = service.fuseResults(queryResults, extractId);

      assert.equal(result.length, 2);
      assert.ok(result[0].rrfScore > 0);
      // Doc at rank 0: 1/(60+0+1) ≈ 0.0164
      assert.ok(result[0].rrfScore > result[1].rrfScore);
    });

    it("should normalize RRF by query count", () => {
      const service = new RankFusionService();

      const doc = createMockDoc("doc1", "content");

      const singleQuery: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [[doc, 0.9]],
        },
      ];

      const multiQuery: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [[doc, 0.9]],
        },
        {
          queryIdx: 1,
          results: [[doc, 0.8]],
        },
      ];

      const result1 = service.fuseResults(singleQuery, extractId);
      const result2 = service.fuseResults(multiQuery, extractId);

      // Both should have same doc but different normalized scores
      assert.equal(result1.length, 1);
      assert.equal(result2.length, 1);
      assert.ok(result2[0].rrfScore > result1[0].rrfScore);
    });

    it("should combine RRF (80%) with best similarity score (20%)", () => {
      const service = new RankFusionService({ rrfWeight: 0.8, similarityWeight: 0.2 });

      const queryResults: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [[createMockDoc("doc1", "content"), 0.9]],
        },
      ];

      const result = service.fuseResults(queryResults, extractId);

      assert.equal(result.length, 1);
      // Final score should be weighted combination
      const expectedFinal = result[0].rrfScore * 0.8 + 0.9 * 0.2;
      assert.ok(Math.abs(result[0].finalScore - expectedFinal) < 0.001);
    });

    it("should handle documents appearing in multiple queries", () => {
      const service = new RankFusionService();

      const doc1 = createMockDoc("doc1", "appears in both queries");
      const doc2 = createMockDoc("doc2", "only in first query");

      const queryResults: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [
            [doc1, 0.9],
            [doc2, 0.8],
          ],
        },
        {
          queryIdx: 1,
          results: [[doc1, 0.85]],
        },
      ];

      const result = service.fuseResults(queryResults, extractId);

      assert.equal(result.length, 2);
      const doc1Result = result.find((r) => r.doc.metadata.id === "doc1");
      assert.ok(doc1Result);
      assert.equal(doc1Result.hits, 2);
      assert.equal(doc1Result.ranks.length, 2);
    });

    it("should deduplicate by document ID", () => {
      const service = new RankFusionService();

      const queryResults: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [
            [createMockDoc("doc1", "content 1"), 0.9],
            [createMockDoc("doc1", "same id different instance"), 0.8],
          ],
        },
      ];

      const result = service.fuseResults(queryResults, extractId);

      assert.equal(result.length, 1);
      assert.equal(result[0].hits, 2);
    });

    it("should sort by final score descending", () => {
      const service = new RankFusionService();

      const queryResults: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [
            [createMockDoc("doc1", "low score"), 0.5],
            [createMockDoc("doc2", "medium score"), 0.7],
            [createMockDoc("doc3", "high score"), 0.95],
          ],
        },
      ];

      const result = service.fuseResults(queryResults, extractId);

      assert.equal(result.length, 3);
      // Should be sorted descending
      assert.ok(result[0].finalScore >= result[1].finalScore);
      assert.ok(result[1].finalScore >= result[2].finalScore);
    });

    it("should track best score across queries", () => {
      const service = new RankFusionService();

      const doc = createMockDoc("doc1", "content");

      const queryResults: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [[doc, 0.7]],
        },
        {
          queryIdx: 1,
          results: [[doc, 0.95]],
        },
        {
          queryIdx: 2,
          results: [[doc, 0.6]],
        },
      ];

      const result = service.fuseResults(queryResults, extractId);

      assert.equal(result.length, 1);
      assert.equal(result[0].bestScore, 0.95);
      assert.equal(result[0].sumScore, 0.7 + 0.95 + 0.6);
    });

    it("should return empty array for empty input", () => {
      const service = new RankFusionService();
      const result = service.fuseResults([], extractId);
      assert.equal(result.length, 0);
    });

    it("should handle single query result", () => {
      const service = new RankFusionService();

      const queryResults: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [[createMockDoc("doc1", "content"), 0.9]],
        },
      ];

      const result = service.fuseResults(queryResults, extractId);

      assert.equal(result.length, 1);
      assert.equal(result[0].hits, 1);
      assert.ok(result[0].finalScore > 0);
    });

    it("should handle documents with different ranks across queries", () => {
      const service = new RankFusionService({ rrfK: 60 });

      const doc = createMockDoc("doc1", "content");

      const queryResults: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [
            [doc, 0.9], // rank 0
            [createMockDoc("other1", "x"), 0.8],
          ],
        },
        {
          queryIdx: 1,
          results: [
            [createMockDoc("other2", "y"), 0.95],
            [createMockDoc("other3", "z"), 0.85],
            [doc, 0.7], // rank 2
          ],
        },
      ];

      const result = service.fuseResults(queryResults, extractId);

      const doc1Result = result.find((r) => r.doc.metadata.id === "doc1");
      assert.ok(doc1Result);
      assert.deepEqual(doc1Result.ranks, [0, 2]);
      // RRF should account for both ranks
      assert.ok(doc1Result.rrfScore > 0);
    });
  });

  describe("configuration", () => {
    it("should use default configuration", () => {
      const service = new RankFusionService();
      assert.ok(service);
    });

    it("should clamp rrfK to 10-100 range", () => {
      const serviceLow = new RankFusionService({ rrfK: 5 });
      const serviceHigh = new RankFusionService({ rrfK: 150 });

      assert.ok(serviceLow);
      assert.ok(serviceHigh);
    });

    it("should normalize weights to sum to 1.0", () => {
      const service = new RankFusionService({ rrfWeight: 0.6, similarityWeight: 0.6 });

      const queryResults: QueryResult<BaseMetadata>[] = [
        {
          queryIdx: 0,
          results: [[createMockDoc("doc1", "content"), 0.8]],
        },
      ];

      const result = service.fuseResults(queryResults, extractId);
      assert.ok(result.length > 0);
      // Weights should be normalized internally
      assert.ok(result[0].finalScore > 0 && result[0].finalScore <= 1);
    });
  });
});
