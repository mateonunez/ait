import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TextGenerationService } from "./text-generation.service";
import { DEFAULT_LANGCHAIN_MODEL, LANGCHAIN_VECTOR_SIZE } from "../../langchain.client";
import { smoothStream } from "./utils/stream.utils";

describe("TextGenerationService", () => {
  const model = DEFAULT_LANGCHAIN_MODEL;
  const expectedVectorSize = LANGCHAIN_VECTOR_SIZE;
  const timeout = 1800000; // 30 minutes

  let service: TextGenerationService;

  describe("generateText", () => {
    describe("github_repositories_collection", () => {
      beforeEach(() => {
        service = new TextGenerationService(model, expectedVectorSize, "github_repositories_collection");
      });

      it("should generate text successfully", { timeout: timeout }, async () => {
        const prompt = "Based on your context, show me the name of some repositories with TypeScript language";
        const result = await service.generateText(prompt);

        assert.ok(result);
      });
    });

    describe("spotify_tracks_collection", () => {
      beforeEach(() => {
        service = new TextGenerationService(model, expectedVectorSize, "spotify_tracks_collection");
      });

      it("should generate text successfully", { timeout: timeout }, async () => {
        const prompt = "Based on your context, show some tracks from Bad Bunny";
        const result = await service.generateText(prompt);

        assert.ok(result);
      });
    });

    describe("x_tweets_collection", () => {
      beforeEach(() => {
        service = new TextGenerationService(model, expectedVectorSize, "x_tweets_collection");
      });

      it("should generate text successfully", { timeout: timeout }, async () => {
        const prompt = "Based on your context, show some tweets from with retweetCount greater than 100 or equal to 0";
        const result = await service.generateText(prompt);

        assert.ok(result);
      });

      it("should generate stream text successfully", { timeout: timeout }, async () => {
        const prompt = "Based on your context, analyze tweets and show me the following information:\n" +
          "1. Tweet text\n" +
          "2. Author username\n" +
          "3. Retweet count\n" +
          "4. Like count\n" +
          "Only include tweets that have either more than 100 retweets or 0 likes. " +
          "Please format the output in a clear, structured way.";

        const result = await smoothStream(service.generateTextStream(prompt), {
          delay: 50,
          prefix: "AI Response:",
          cursor: "▌",
        });

        assert.ok(result.trim(), "Generated stream text should not be empty");
      });
    });
  });
});
