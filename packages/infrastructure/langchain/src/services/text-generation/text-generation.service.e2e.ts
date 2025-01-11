import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TextGenerationService } from "./text-generation.service";
import { DEFAULT_LANGCHAIN_MODEL, LANGCHAIN_VECTOR_SIZE } from "../../langchain.client";

describe("TextGenerationService", () => {
  const model = DEFAULT_LANGCHAIN_MODEL;
  const expectedVectorSize = LANGCHAIN_VECTOR_SIZE;
  const timeout = 900000; // 15 minutes

  let service: TextGenerationService;

  describe("generateText", () => {
    describe("github_repositories_collection", () => {
      beforeEach(() => {
        service = new TextGenerationService(model, expectedVectorSize, "github_repositories_collection");
      });

      it("should generate text successfully", { timeout: timeout }, async () => {
        const prompt = "Based on your context, show me the repositories with JavaScript lanaguae";
        const result = await service.generateText(prompt);

        assert.ok(result);
      });
    });

    describe("spotify_tracks_collection", () => {
      beforeEach(() => {
        service = new TextGenerationService(model, expectedVectorSize, "spotify_tracks_collection");
      });

      it("should generate text successfully", { timeout: timeout }, async () => {
        const prompt = "Based on your context, show me the tracks of the alt J artist";
        const result = await service.generateText(prompt);

        assert.ok(result);
      });
    });
  });
});
