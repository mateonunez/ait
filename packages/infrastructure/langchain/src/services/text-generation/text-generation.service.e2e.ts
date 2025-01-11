import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TextGenerationService } from "./text-generation.service";
import { DEFAULT_LANGCHAIN_MODEL, LANGCHAIN_VECTOR_SIZE } from "../../langchain.client";

describe("TextGenerationService", () => {
  const model = DEFAULT_LANGCHAIN_MODEL;
  const expectedVectorSize = LANGCHAIN_VECTOR_SIZE;

  let service: TextGenerationService;

  beforeEach(() => {
    service = new TextGenerationService(model, expectedVectorSize, "github_repositories_collection");
  });

  describe("generateText", () => {
    it("should generate text successfully", async () => {
      const prompt = "Show to me the repositories that contain typescript'.";

      const result = await service.generateText(prompt);

      assert.strictEqual(typeof result, "string");
      assert.strictEqual(result.length > 0, true);
    });
  });
});
