import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { CollectionDiversityService } from "../../../src/services/ranking/collection-diversity.service";
import type { WeightedDocument } from "../../../src/types/collections";
import type { BaseMetadata } from "../../../src/types/documents";

describe("CollectionDiversityService", () => {
  let service: CollectionDiversityService;

  const createDoc = (
    id: string,
    vendor: "spotify" | "github" | "linear",
    score: number,
    weight = 1.0,
  ): WeightedDocument<BaseMetadata> => ({
    pageContent: `Content for ${id}`,
    metadata: { id, __type: "test", source: vendor, title: id },
    collectionVendor: vendor,
    collectionWeight: weight,
    finalScore: score,
  });

  beforeEach(() => {
    service = new CollectionDiversityService({
      minDocsPerCollection: 2,
      maxCollectionDominance: 0.6,
      enforceMinRepresentation: true,
      interleavingStrategy: "weighted",
    });
  });

  describe("enforceMinRepresentation", () => {
    it("should ensure minimum documents from each collection", () => {
      const docs = new Map([
        [
          "spotify",
          [createDoc("s1", "spotify", 0.9), createDoc("s2", "spotify", 0.8), createDoc("s3", "spotify", 0.7)],
        ],
        ["github", [createDoc("g1", "github", 0.2), createDoc("g2", "github", 0.1)]],
      ]);

      // @ts-ignore - Testing private/internal method via public interface if possible, but here we test the method directly as it is public in interface
      const result = service.enforceMinRepresentation(docs as any, 2, 10);

      const spotifyCount = result.filter((d) => d.collectionVendor === "spotify").length;
      const githubCount = result.filter((d) => d.collectionVendor === "github").length;

      assert.ok(spotifyCount >= 2);
      assert.equal(githubCount, 2); // Has exactly 2 available
    });

    it("should respect max total limit", () => {
      const docs = new Map([
        ["spotify", [createDoc("s1", "spotify", 0.9), createDoc("s2", "spotify", 0.8)]],
        ["github", [createDoc("g1", "github", 0.2)]],
      ]);

      const result = service.enforceMinRepresentation(docs as any, 2, 2);

      assert.equal(result.length, 2);
    });
  });

  describe("interleaveCollections", () => {
    it("should interleave using weighted strategy", () => {
      const docs = new Map([
        ["spotify", [createDoc("s1", "spotify", 0.9), createDoc("s2", "spotify", 0.8)]],
        ["github", [createDoc("g1", "github", 0.9), createDoc("g2", "github", 0.8)]],
      ]);

      const weights = new Map([
        ["spotify", 0.8],
        ["github", 0.2],
      ]);

      const result = service.interleaveCollections(docs as any, weights as any, 4);

      // With 0.8 vs 0.2, Spotify should come first and have more representation if limited
      // But here we take all 4.
      assert.equal(result.length, 4);
      // First doc should likely be spotify due to higher weight
      assert.equal(result[0].collectionVendor, "spotify");
    });

    it("should interleave using round-robin strategy", () => {
      service = new CollectionDiversityService({ interleavingStrategy: "round-robin" });

      const docs = new Map([
        ["spotify", [createDoc("s1", "spotify", 0.9), createDoc("s2", "spotify", 0.8)]],
        ["github", [createDoc("g1", "github", 0.9), createDoc("g2", "github", 0.8)]],
      ]);

      const weights = new Map([
        ["spotify", 1.0],
        ["github", 1.0],
      ]);

      const result = service.interleaveCollections(docs as any, weights as any, 4);

      // Should alternate: s1, g1, s2, g2 (or similar depending on implementation details)
      assert.notEqual(result[0].collectionVendor, result[1].collectionVendor);
      assert.notEqual(result[2].collectionVendor, result[3].collectionVendor);
    });
  });

  describe("applyDiversityConstraints", () => {
    it("should apply all constraints correctly", () => {
      // 10 Spotify docs (high scores), 2 Github docs (low scores)
      const spotifyDocs = Array.from({ length: 10 }, (_, i) => createDoc(`s${i}`, "spotify", 0.9 - i * 0.01));
      const githubDocs = [createDoc("g1", "github", 0.1), createDoc("g2", "github", 0.05)];

      const allDocs = [...spotifyDocs, ...githubDocs];

      // Config: min 2 per collection, max 60% dominance
      const result = service.applyDiversityConstraints(allDocs, 10);

      const spotifyCount = result.filter((d) => d.collectionVendor === "spotify").length;
      const githubCount = result.filter((d) => d.collectionVendor === "github").length;

      // Should have both github docs despite low scores (enforceMinRepresentation)
      assert.equal(githubCount, 2);

      // Spotify should be capped at 6 (60% of 10)
      assert.ok(spotifyCount <= 6);

      // Total should be 8 (6 spotify + 2 github)
      assert.equal(result.length, 8);
    });

    it("should handle single collection without diversity logic", () => {
      const docs = [createDoc("s1", "spotify", 0.9)];
      const result = service.applyDiversityConstraints(docs, 10);
      assert.equal(result.length, 1);
      assert.equal(result[0].metadata.id, "s1");
    });
  });
});
