process.env.QDRANT_URL = "http://localhost:6333";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRAGPipeline } from "../../src/pipelines/rag.pipeline";

describe("RAG Pipeline Configuration", () => {
  it("should configure retrieval stage with correct defaults", async () => {
    const pipeline = createRAGPipeline();
    // @ts-ignore
    const stages = pipeline.getStages ? pipeline.getStages() : pipeline._stages;
    const retrievalStage = stages.find((s: any) => s.name === "retrieval");

    // @ts-ignore
    const service = retrievalStage._multiQueryRetrieval;

    // @ts-ignore
    assert.equal(service._maxDocs, 50, "Retrieval service should have maxDocs=50");
  });
});
