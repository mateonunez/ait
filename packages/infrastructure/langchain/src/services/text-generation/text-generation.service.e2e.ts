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
    const prompt = `
      Tell me about yourself. What drives you? What are you building and why? 
      I don't want a resume or a pattern analysis, I want to understand who you are 
      through what you create, what you listen to, what you share. Be honest, be direct, 
      skip the corporate speak.
    `;

    const result = await smoothStream(service.generateTextStream(prompt), {
      delay: 50,
      prefix: "AIt:",
      cursor: "▌",
    });

    console.log("Generated stream text:", result);

    assert.ok(result.trim(), "Generated stream text should not be empty");

    // Verify the response has substance and uses first-person perspective
    const lowerResult = result.toLowerCase();
    const hasSubstantialContent = lowerResult.length > 200;

    // Check for first-person language (AIt speaking AS Mateo)
    const firstPersonIndicators = [" i ", " my ", " me ", " i'm ", " i've "];
    const hasFirstPerson = firstPersonIndicators.some((indicator) => lowerResult.includes(indicator));

    // Check that it's NOT using third-person about Mateo
    const thirdPersonPatterns = [" he ", " his ", " him ", "mateo's", "mateo is", "mateo has"];
    const hasThirdPerson = thirdPersonPatterns.some((pattern) => lowerResult.includes(pattern));

    assert.ok(hasSubstantialContent, "Response should be substantial and analytical (>200 chars)");
    assert.ok(hasFirstPerson, "Response should use first-person perspective (I, my, me)");
    assert.ok(!hasThirdPerson, "Response should NOT refer to Mateo in third person (he, his, him)");
  });
});
