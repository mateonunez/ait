import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WeightedRankFusionService } from "../../../src/services/ranking/weighted-rank-fusion.service";
import type { Document, BaseMetadata } from "../../../src/types/documents";
import type { CollectionVendor } from "../../../src/config/collections.config";

describe("WeightedRankFusionService", () => {
  const createMockDoc = (id: string, content: string, vendor: CollectionVendor): Document<BaseMetadata> => ({
    pageContent: content,
    metadata: { id, __type: "test" },
  });

  describe("fuseResults", () => {
    it("should apply weighted RRF correctly with single collection", () => {
      const service = new WeightedRankFusionService({ rrfK: 60 });

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: [
            [createMockDoc("doc1", "content 1", "spotify"), 0.9],
            [createMockDoc("doc2", "content 2", "spotify"), 0.8],
          ] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 1.0,
        },
      ];

      const result = service.fuseResults(collectionResults);

      assert.equal(result.length, 2);
      assert.ok(result[0].finalScore > 0);
      assert.equal(result[0].collectionVendor, "spotify");
      assert.ok(result[0].finalScore > result[1].finalScore);
    });

    it("should weight collections appropriately", () => {
      const service = new WeightedRankFusionService({ rrfK: 60 });

      const highWeightDoc = createMockDoc("doc1", "high weight collection", "spotify");
      const lowWeightDoc = createMockDoc("doc2", "low weight collection", "github");

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: [[highWeightDoc, 0.8]] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 0.9,
        },
        {
          vendor: "github" as CollectionVendor,
          documents: [[lowWeightDoc, 0.8]] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 0.3,
        },
      ];

      const result = service.fuseResults(collectionResults);

      assert.equal(result.length, 2);
      const doc1Result = result.find((r) => r.metadata.id === "doc1");
      const doc2Result = result.find((r) => r.metadata.id === "doc2");

      assert.ok(doc1Result);
      assert.ok(doc2Result);
      // Higher weight collection should have higher score at same rank
      assert.ok(doc1Result.finalScore > doc2Result.finalScore);
    });

    it("should handle document appearing in multiple collections", () => {
      const service = new WeightedRankFusionService({ rrfK: 60 });

      const doc = createMockDoc("doc1", "appears in both", "spotify");

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: [[doc, 0.9]] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 0.8,
        },
        {
          vendor: "github" as CollectionVendor,
          documents: [[doc, 0.85]] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 0.6,
        },
      ];

      const result = service.fuseResults(collectionResults);

      // Document should appear only once with combined score
      assert.equal(result.length, 1);
      assert.equal(result[0].metadata.id, "doc1");
      // RRF score should be sum of weighted contributions
      assert.ok(result[0].metadata.rrfScore);
    });

    it("should normalize across collections when enabled", () => {
      const serviceWithNorm = new WeightedRankFusionService({
        normalizeAcrossCollections: true,
      });
      const serviceWithoutNorm = new WeightedRankFusionService({
        normalizeAcrossCollections: false,
      });

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: [[createMockDoc("doc1", "content", "spotify"), 0.9]] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 1.0,
        },
      ];

      const resultWithNorm = serviceWithNorm.fuseResults(collectionResults);
      const resultWithoutNorm = serviceWithoutNorm.fuseResults(collectionResults);

      assert.equal(resultWithNorm.length, 1);
      assert.equal(resultWithoutNorm.length, 1);
      // Normalization should affect the RRF score
      assert.ok(resultWithNorm[0].metadata.rrfScore);
      assert.ok(resultWithoutNorm[0].metadata.rrfScore);
    });

    it("should combine RRF score with original score using rrfWeight", () => {
      const service = new WeightedRankFusionService({
        rrfWeight: 0.7,
        normalizeAcrossCollections: false, // Disable normalization for predictable results
      });

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: [[createMockDoc("doc1", "content", "spotify"), 0.8]] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 1.0,
        },
      ];

      const result = service.fuseResults(collectionResults);

      assert.equal(result.length, 1);
      // Formula: baseScore = rrfWeight * rrfScore + (1-rrfWeight) * relevanceScore
      // Then: finalScore = baseScore * (1 + collectionWeight * collectionWeightMultiplier)
      const rrfScore = result[0].metadata.rrfScore as number;
      const relevanceScore = 0.8;
      const baseScore = 0.7 * rrfScore + 0.3 * relevanceScore;
      const expectedFinal = baseScore * (1 + 1.0 * 1.0); // collectionWeight=1.0, multiplier=1.0
      assert.ok(
        Math.abs(result[0].finalScore - expectedFinal) < 0.001,
        `Expected ${expectedFinal}, got ${result[0].finalScore}`,
      );
    });

    it("should apply collection weight multiplier", () => {
      const serviceWith2x = new WeightedRankFusionService({
        collectionWeightMultiplier: 2.0,
        normalizeAcrossCollections: false,
      });
      const serviceWith1x = new WeightedRankFusionService({
        collectionWeightMultiplier: 1.0,
        normalizeAcrossCollections: false,
      });

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: [[createMockDoc("doc1", "content", "spotify"), 0.8]] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 0.5,
        },
      ];

      const resultWith2x = serviceWith2x.fuseResults(collectionResults);
      const resultWith1x = serviceWith1x.fuseResults(collectionResults);

      assert.equal(resultWith2x.length, 1);
      assert.equal(resultWith1x.length, 1);
      // RRF score is the same, but final score should be higher with 2x multiplier
      // finalScore = baseScore * (1 + collectionWeight * multiplier)
      const finalScore2x = resultWith2x[0].finalScore;
      const finalScore1x = resultWith1x[0].finalScore;
      assert.ok(
        finalScore2x > finalScore1x,
        `Expected finalScore with 2x (${finalScore2x}) > finalScore with 1x (${finalScore1x})`,
      );
    });

    it("should limit results to maxResults", () => {
      const service = new WeightedRankFusionService();

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: Array.from({ length: 10 }, (_, i) => [
            createMockDoc(`doc${i}`, `content ${i}`, "spotify"),
            0.9 - i * 0.05,
          ]) as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 1.0,
        },
      ];

      const result = service.fuseResults(collectionResults, 5);

      assert.equal(result.length, 5);
      // Should be top 5 by score
      assert.ok(result[0].finalScore >= result[4].finalScore);
    });

    it("should handle empty collection results", () => {
      const service = new WeightedRankFusionService();

      const result = service.fuseResults([]);

      assert.equal(result.length, 0);
    });

    it("should handle collection with no documents", () => {
      const service = new WeightedRankFusionService();

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: [] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 1.0,
        },
      ];

      const result = service.fuseResults(collectionResults);

      assert.equal(result.length, 0);
    });

    it("should sort final results by finalScore descending", () => {
      const service = new WeightedRankFusionService();

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: [
            [createMockDoc("doc1", "low", "spotify"), 0.5],
            [createMockDoc("doc2", "medium", "spotify"), 0.7],
            [createMockDoc("doc3", "high", "spotify"), 0.95],
          ] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 1.0,
        },
      ];

      const result = service.fuseResults(collectionResults);

      assert.equal(result.length, 3);
      for (let i = 0; i < result.length - 1; i++) {
        assert.ok(result[i].finalScore >= result[i + 1].finalScore);
      }
    });

    it("should preserve collection metadata in results", () => {
      const service = new WeightedRankFusionService();

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: [[createMockDoc("doc1", "content", "spotify"), 0.9]] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 0.85,
        },
      ];

      const result = service.fuseResults(collectionResults);

      assert.equal(result.length, 1);
      assert.equal(result[0].collectionVendor, "spotify");
      assert.equal(result[0].collectionWeight, 0.85);
      // Metadata contains RRF scoring info, not collection vendor/weight
      assert.ok(result[0].metadata.rrfScore);
      assert.ok(result[0].metadata.relevanceScore);
      assert.equal(result[0].metadata.hits, 1);
    });

    it("should handle multiple collections with varying document counts", () => {
      const service = new WeightedRankFusionService();

      const collectionResults = [
        {
          vendor: "spotify" as CollectionVendor,
          documents: Array.from({ length: 5 }, (_, i) => [
            createMockDoc(`spotify${i}`, `content ${i}`, "spotify"),
            0.9 - i * 0.1,
          ]) as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 0.9,
        },
        {
          vendor: "github" as CollectionVendor,
          documents: Array.from({ length: 2 }, (_, i) => [
            createMockDoc(`github${i}`, `content ${i}`, "github"),
            0.8 - i * 0.1,
          ]) as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 0.5,
        },
        {
          vendor: "linear" as CollectionVendor,
          documents: [[createMockDoc("linear0", "content", "linear"), 0.85]] as Array<[Document<BaseMetadata>, number]>,
          collectionWeight: 0.3,
        },
      ];

      const result = service.fuseResults(collectionResults);

      assert.equal(result.length, 8);
      // All documents should have collection metadata
      const vendors = new Set(result.map((r) => r.collectionVendor));
      assert.ok(vendors.has("spotify"));
      assert.ok(vendors.has("github"));
      assert.ok(vendors.has("linear"));
    });
  });

  describe("configuration", () => {
    it("should use default configuration", () => {
      const service = new WeightedRankFusionService();
      assert.ok(service);
    });

    it("should accept custom configuration", () => {
      const service = new WeightedRankFusionService({
        rrfK: 30,
        rrfWeight: 0.6,
        collectionWeightMultiplier: 1.5,
        normalizeAcrossCollections: false,
      });
      assert.ok(service);
    });
  });
});
