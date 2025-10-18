import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TextGenerationService } from "./text-generation.service";
import { DEFAULT_EMBEDDINGS_MODEL, DEFAULT_GENERATION_MODEL, GENERATION_VECTOR_SIZE } from "../../langchain.client";
import { smoothStream } from "./utils/stream.utils";

describe("AIt Personality Integration", () => {
  const model = DEFAULT_GENERATION_MODEL;
  const embeddingsModel = DEFAULT_EMBEDDINGS_MODEL;
  const expectedVectorSize = GENERATION_VECTOR_SIZE;
  const timeout = 1800000;

  let service: TextGenerationService;

  beforeEach(() => {
    service = new TextGenerationService(model, embeddingsModel, expectedVectorSize, "ait_embeddings_collection");
  });

  it("should analyze knowledge base with sharp analytical personality and depth", { timeout: timeout }, async () => {
    const prompt = `Analyze Mateo's digital footprint in the knowledge base and tell me what patterns reveal about him as a developer and person. Don't just list facts, challenge assumptions and dig into what the data actually means. What tensions do you see between what he creates, what he shares, and what matters? Be sharp, be honest, skip the corporate speak.`;

    const result = await smoothStream(service.generateTextStream(prompt), {
      delay: 50,
      prefix: "AIt:",
      cursor: "▌",
    });

    console.log("Generated stream text:", result);

    assert.ok(result.trim(), "Generated stream text should not be empty");

    // Verify the response has substance (personality traits)
    const lowerResult = result.toLowerCase();
    const hasAnalyticalContent = lowerResult.length > 200; // Should be a thoughtful response

    assert.ok(hasAnalyticalContent, "Response should be substantial and analytical");
  });
});
