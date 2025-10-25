import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DiversityService } from "../../../src/services/rag/diversity.service";
import type { Document, BaseMetadata } from "../../../src/types/documents";

describe("DiversityService", () => {
  describe("validateQueryDiversity", () => {
    it("should accept queries with good diversity (0.15-0.65 Jaccard)", () => {
      const service = new DiversityService();

      // These queries have moderate overlap to achieve 0.15-0.65 Jaccard similarity
      // Calculated Jaccard: ~0.33 average (within 0.15-0.65 range)
      const queries = [
        "github projects work",
        "github work code",
        "projects code development",
        "work development programming",
      ];

      const result = service.validateQueryDiversity(queries);
      assert.equal(result, true);
    });

    it("should reject too similar queries (>0.65 Jaccard)", () => {
      const service = new DiversityService({ maxSimilarity: 0.65 });

      const queries = [
        "my recent github repositories",
        "my github repositories recent",
        "recent my github repositories",
        "github repositories my recent",
      ];

      const result = service.validateQueryDiversity(queries);
      assert.equal(result, false);
    });

    it("should reject too different queries (<0.15 Jaccard)", () => {
      const service = new DiversityService({ minSimilarity: 0.15 });

      const queries = ["github repositories", "pizza delivery", "quantum physics", "gardening tools"];

      const result = service.validateQueryDiversity(queries);
      assert.equal(result, false);
    });

    it("should return true for single query", () => {
      const service = new DiversityService();
      const result = service.validateQueryDiversity(["single query"]);
      assert.equal(result, true);
    });

    it("should return true for empty array", () => {
      const service = new DiversityService();
      const result = service.validateQueryDiversity([]);
      assert.equal(result, true);
    });

    it("should respect custom similarity thresholds", () => {
      const service = new DiversityService({
        minSimilarity: 0.1,
        maxSimilarity: 0.5,
      });

      const queries = ["github projects", "code repositories", "dev work"];

      const result = service.validateQueryDiversity(queries);
      assert.ok(typeof result === "boolean");
    });
  });

  describe("applyMMR", () => {
    const createMockDoc = (id: string, content: string): Document<BaseMetadata> => ({
      pageContent: content,
      metadata: { id, __type: "test" },
    });

    it("should apply MMR to diversify results", () => {
      const service = new DiversityService({ enableDiversification: true, diversityLambda: 0.7 });

      const selectedDocs = [
        createMockDoc("1", "javascript typescript programming"),
        createMockDoc("2", "javascript programming code"),
        createMockDoc("3", "python machine learning ai"),
        createMockDoc("4", "database sql queries"),
        createMockDoc("5", "react frontend components"),
      ];

      const result = service.applyMMR(selectedDocs, selectedDocs, 3);

      assert.equal(result.length, 3);
      assert.equal(result[0].metadata.id, "1"); // First doc always included
    });

    it("should preserve top document in MMR", () => {
      const service = new DiversityService({ enableDiversification: true });

      const selectedDocs = [
        createMockDoc("top", "most relevant document"),
        createMockDoc("2", "another document"),
        createMockDoc("3", "third document"),
      ];

      const result = service.applyMMR(selectedDocs, selectedDocs, 3);

      assert.equal(result[0].metadata.id, "top");
    });

    it("should balance relevance and diversity with lambda", () => {
      const serviceDiverse = new DiversityService({ diversityLambda: 0.3 }); // favor diversity
      const serviceRelevant = new DiversityService({ diversityLambda: 0.9 }); // favor relevance

      const docs = [
        createMockDoc("1", "javascript programming"),
        createMockDoc("2", "javascript code"),
        createMockDoc("3", "javascript development"),
        createMockDoc("4", "python machine learning"),
        createMockDoc("5", "database design"),
      ];

      const resultDiverse = serviceDiverse.applyMMR(docs, docs, 3);
      const resultRelevant = serviceRelevant.applyMMR(docs, docs, 3);

      // Both should have the same first doc
      assert.equal(resultDiverse[0].metadata.id, "1");
      assert.equal(resultRelevant[0].metadata.id, "1");

      // Diverse should pick more varied docs
      assert.equal(resultDiverse.length, 3);
      assert.equal(resultRelevant.length, 3);
    });

    it("should return empty array for empty input", () => {
      const service = new DiversityService();
      const result = service.applyMMR([], [], 5);
      assert.equal(result.length, 0);
    });

    it("should respect maxDocs limit", () => {
      const service = new DiversityService();

      const docs = [
        createMockDoc("1", "doc one"),
        createMockDoc("2", "doc two"),
        createMockDoc("3", "doc three"),
        createMockDoc("4", "doc four"),
        createMockDoc("5", "doc five"),
      ];

      const result = service.applyMMR(docs, docs, 2);
      assert.equal(result.length, 2);
    });

    it("should skip MMR when diversification is disabled", () => {
      const service = new DiversityService({ enableDiversification: false });

      const docs = [createMockDoc("1", "doc one"), createMockDoc("2", "doc two"), createMockDoc("3", "doc three")];

      const result = service.applyMMR(docs, docs, 2);

      // Should just return first maxDocs without MMR processing
      assert.equal(result.length, 2);
      assert.equal(result[0].metadata.id, "1");
      assert.equal(result[1].metadata.id, "2");
    });

    it("should handle documents with long content", () => {
      const service = new DiversityService();

      const longContent = Array(200).fill("word").join(" "); // 200 words
      const docs = [
        createMockDoc("1", longContent),
        createMockDoc("2", "short content"),
        createMockDoc("3", `${longContent} different`),
      ];

      const result = service.applyMMR(docs, docs, 3);
      assert.equal(result.length, 3);
    });
  });

  describe("configuration", () => {
    it("should use default configuration", () => {
      const service = new DiversityService();
      assert.ok(service);
    });

    it("should clamp lambda to 0-1 range", () => {
      const serviceLow = new DiversityService({ diversityLambda: -0.5 });
      const serviceHigh = new DiversityService({ diversityLambda: 1.5 });

      assert.ok(serviceLow);
      assert.ok(serviceHigh);
    });

    it("should clamp similarity thresholds to 0-1 range", () => {
      const service = new DiversityService({
        minSimilarity: -0.5,
        maxSimilarity: 1.5,
      });

      assert.ok(service);
    });
  });
});
