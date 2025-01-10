import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { TextGenerationService, TextGenerationError } from "./text-generation.service";

describe("TextGenerationService", () => {
  const model = "gemma:2b";
  const expectedVectorSize = 2048;
  const prompt = "test prompt";

  let service: TextGenerationService;

  beforeEach(() => {
    service = new TextGenerationService(model, expectedVectorSize);
  });

  describe("generateText", () => {
    it("should generate text successfully", async () => {
      const result = await service.generateText(prompt);

      assert.strictEqual(typeof result, "string");
      assert.strictEqual(result.length > 0, true);
    });

    it("should throw TextGenerationError when text generation fails", async () => {
      try {
        const invalidPrompt = "";
        await service.generateText(invalidPrompt);
        assert.fail("Expected error to be thrown");
      } catch (error) {
        assert(error instanceof TextGenerationError);
        assert.strictEqual(error.message.includes("Failed to generate text"), true);
      }
    });

    it("should use default model when not provided", async () => {
      service = new TextGenerationService();
      const result = await service.generateText(prompt);

      assert.strictEqual(typeof result, "string");
      assert.strictEqual(result.length > 0, true);
    });
  });
});
