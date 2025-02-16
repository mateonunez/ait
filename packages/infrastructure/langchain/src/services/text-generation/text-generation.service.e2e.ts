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
            "Based on your context, analyze playlists and show me the Playlist information in a structured way\n" +
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

      describe("albums", () => {
        beforeEach(() => {
          service = new TextGenerationService(model, expectedVectorSize, "spotify_albums_collection");
        });

        it("should generate amazing stream text for Spotify albums", { timeout }, async () => {
          const prompt = `
          Based on the vector store data in spotify_albums_collection, analyze and present a comprehensive analysis of the albums. Use ONLY the information available in the context, with strict adherence to the data schema.
        
          For each album in the context, structure the analysis as follows:
        
          1. **Core Album Details**
             - Album ID (from data store)
             - Name (exact match from database)
             - Album Type (single/album/compilation)
             - Artists Array (maintain original structure)
             - Release Information:
               * Release Date (preserve original format)
               * Release Date Precision
             - URI and External URLs
        
          2. **Performance Metrics**
             - Popularity Score (raw number)
             - Total Tracks Count
             - Is Playable Status
             - Market Availability List
        
          3. **Extended Metadata**
             - Record Label
             - Copyright Information (full array)
             - External IDs (maintain all identifiers)
             - Genre Classifications
             - Additional Metadata:
               * Creation Timestamp
               * Last Update Timestamp
               * Vector Store Metadata (__type, correlation_id)
        
          Response Format Requirements:
          1. Use structured markdown with clear hierarchical organization
          2. Preserve all numerical precision
          3. Maintain array structures as stored
          4. Include __type and metadata fields from vector store
          5. Report timestamps in ISO format
          6. Keep all IDs in their original format
          7. Present lists with proper markdown bullet points
          8. Format JSON data with proper escaping ({{ and }})
        
          Data Validation Rules:
          1. Only include fields present in the vector store
          2. Maintain data type consistency with schema
          3. Preserve relationship references
          4. Report null/undefined fields as "Not Available"
          5. Keep array structures intact
          6. Respect boolean flags as stored
        
          Note: Strictly adhere to the data schema and vector store structure. Do not infer, extrapolate, or make assumptions about missing data.
          `;

          const result = await smoothStream(service.generateTextStream(prompt), {
            delay: 50,
            prefix: "AI Response:",
            cursor: "▌",
          });

          assert.ok(result.trim(), "Generated stream text should not be empty");
          console.log("Generated stream text:", result);
        });
      });
    });
  });
});
