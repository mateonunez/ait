import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TextGenerationService } from "./text-generation.service";

describe("TextGenerationService", () => {
  const model = "gemma:2b";
  const expectedVectorSize = 2048;

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
