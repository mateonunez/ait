import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TextGenerationService } from "./text-generation.service";
import { DEFAULT_LANGCHAIN_MODEL, LANGCHAIN_VECTOR_SIZE } from "../../langchain.client";
import { smoothStream } from "./utils/stream.utils";

describe("TextGenerationService", () => {
  const model = DEFAULT_LANGCHAIN_MODEL;
  const expectedVectorSize = LANGCHAIN_VECTOR_SIZE;
  const timeout = 1800000;

  let service: TextGenerationService;

  describe("generateText", () => {
    describe("github", () => {
      beforeEach(() => {
        service = new TextGenerationService(model, expectedVectorSize, "github_repositories_collection");
      });

      describe("repositories", () => {
        it("should generate text successfully", { timeout: timeout }, async () => {
          const prompt = "Based on your context, show me the name of some repositories with TypeScript language";
          const result = await service.generateText(prompt);

          assert.ok(result);
        });
      });
    });

    describe("spotify", () => {
      beforeEach(() => {
        service = new TextGenerationService(model, expectedVectorSize, "spotify_tracks_collection");
      });

      describe("tracks", () => {
        it("should generate text successfully", { timeout: timeout }, async () => {
          const prompt = "Based on your context, show some tracks from Bad Bunny";
          const result = await service.generateText(prompt);

          assert.ok(result);
        });
      });

      describe("artists", () => {
        it("should generate text successfully", { timeout: timeout }, async () => {
          const prompt = "Based on your context, show some artists from Bad Bunny";
          const result = await service.generateText(prompt);

          assert.ok(result);
        });
      });

      describe("playlists", () => {
        it("should generate text successfully", { timeout: timeout }, async () => {
          const prompt = "Based on your context, show some playlists from Bad Bunny";
          const result = await service.generateText(prompt);

          assert.ok(result);
        });
      });

      describe("albums", () => {
        it("should generate text successfully", { timeout: timeout }, async () => {
          const prompt = "Based on your context, show some albums from Bad Bunny";
          const result = await service.generateText(prompt);

          assert.ok(result);
        });
      });
    });

    describe("x", () => {
      beforeEach(() => {
        service = new TextGenerationService(model, expectedVectorSize, "x_tweets_collection");
      });

      describe("tweets", () => {
        it("should generate text successfully", { timeout: timeout }, async () => {
          const prompt =
            "Based on your context, show some tweets from with retweetCount greater than 100 or equal to 0";
          const result = await service.generateText(prompt);

          assert.ok(result);
        });
      });
    });

    describe("stream", () => {
      beforeEach(() => {
        service = new TextGenerationService(model, expectedVectorSize, "x_tweets_collection");
      });

      describe("tweets", () => {
        it.skip("should generate stream text successfully", { timeout: timeout }, async () => {
          const prompt =
            "Based on your context, analyze tweets and show me the following information:\n" +
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

      describe("playlists", () => {
        beforeEach(() => {
          service = new TextGenerationService(model, expectedVectorSize, "spotify_playlists_collection");
        });

        it("should generate stream text successfully", { timeout: timeout }, async () => {
          const prompt =
            "Based on your context, analyze playlists and show me the following information:\n" +
            "1. Playlist name\n" +
            "2. Playlist owner username\n" +
            "3. Number of tracks\n" +
            "4. Number of followers\n" +
            "Only include playlists from mateonunez or collaborative playlists. " +
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
});
