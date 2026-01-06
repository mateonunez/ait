import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TypeFilterService } from "../../../src/services/filtering/type-filter.service";

describe("TypeFilterService", () => {
  let service: TypeFilterService;

  describe("inferTypes", () => {
    it("should detect GitHub types for repository queries", () => {
      service = new TypeFilterService();

      const result1 = service.inferTypes([], "show me github repositories");
      assert.ok(result1, "Should detect filter for github repositories");
      assert.ok(result1?.types?.includes("github_repository"), "Should include repository");

      const result2 = service.inferTypes([], "my GitHub pull requests");
      assert.ok(result2, "Should detect filter for pull requests");
      assert.ok(result2?.types?.includes("github_pull_request"), "Should include pull_request");

      const result3 = service.inferTypes([], "git commits");
      assert.ok(result3, "Should detect filter for commits");
      assert.ok(result3?.types?.includes("github_commit"), "Should include commit");
    });

    it("should detect Linear types for issue queries", () => {
      service = new TypeFilterService();

      const queries = ["show linear issue", "my tasks in linear", "ticket status", "bug tracker", "task list"];

      for (const query of queries) {
        const result = service.inferTypes([], query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.deepEqual(result?.types, ["linear_issue"]);
      }
    });

    it("should detect Spotify types for music queries", () => {
      service = new TypeFilterService();

      // Each query should match the specific keyword(s) present
      const result1 = service.inferTypes([], "spotify playlist");
      assert.ok(result1, "Should detect filter for playlist");
      assert.ok(result1?.types?.includes("spotify_playlist"), "Should include playlist");

      const result2 = service.inferTypes([], "music track");
      assert.ok(result2, "Should detect filter for music/track");
      assert.ok(result2?.types?.includes("spotify_track"), "Should include track");

      const result3 = service.inferTypes([], "favorite song");
      assert.ok(result3, "Should detect filter for song");
      assert.ok(result3?.types?.includes("spotify_track"), "Should include track from song keyword");

      const result4 = service.inferTypes([], "what am I listening to");
      assert.ok(result4, "Should detect filter for listening");
      assert.ok(result4?.types?.includes("spotify_track"), "Should include track from listening keyword");
    });

    it("should detect Twitter types for tweet queries", () => {
      service = new TypeFilterService();

      const queries = ["my tweet", "twitter posts", "posted on twitter", "x.com posts"];

      for (const query of queries) {
        const result = service.inferTypes([], query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.deepEqual(result?.types, ["x_tweet"]);
      }
    });

    it("should detect Google Calendar events for meeting/calendar queries", () => {
      service = new TypeFilterService();

      const queries = [
        "check my calendar for upcoming meetings",
        "what meetings do I have today",
        "show my schedule",
        "upcoming appointments",
        "calendar events this week",
      ];

      for (const query of queries) {
        const result = service.inferTypes([], query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.ok(
          result?.types?.includes("google_calendar_event"),
          `Should include google_calendar_event for: ${query}`,
        );
      }
    });

    it("should return undefined for generic queries", () => {
      service = new TypeFilterService();

      // Truly generic queries that don't contain any entity keywords
      const queries = ["what have I been working on", "show me everything", "my data", "hello world"];

      for (const query of queries) {
        const result = service.inferTypes([], query);
        assert.equal(result, undefined, `Should return undefined for: ${query}`);
      }
    });

    it("should not confuse domains (spotify query should not return github filter)", () => {
      service = new TypeFilterService();

      // Use singular forms that match the keywords in entities.config.ts
      const result = service.inferTypes([], "spotify track and album");
      assert.ok(result);
      // Should match spotify_track (from "track" keyword) and spotify_album (from "album" keyword)
      assert.ok(result.types?.includes("spotify_track"), "Should include spotify_track");
      assert.ok(result.types?.includes("spotify_album"), "Should include spotify_album");
      assert.ok(!result.types?.includes("github_repository"), "Should not include github_repository");
    });

    it("should detect multiple domains when both keywords present", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "playlist from github repositories");
      assert.ok(result);
      // Should detect both music and code types
      assert.ok(result.types?.includes("spotify_playlist"), "Should include playlist");
      assert.ok(result.types?.includes("github_repository"), "Should include repository");
    });

    it("should be case insensitive", () => {
      service = new TypeFilterService();

      const result1 = service.inferTypes([], "GITHUB REPOSITORIES");
      const result2 = service.inferTypes([], "GitHub Repositories");
      const result3 = service.inferTypes([], "github repositories");

      assert.ok(result1?.types?.includes("github_repository"));
      assert.ok(result2?.types?.includes("github_repository"));
      assert.ok(result3?.types?.includes("github_repository"));
    });

    it("should handle multiple type keywords in same domain", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "github repositories and projects and code");
      assert.ok(result);
      assert.ok(result.types?.includes("github_repository"));
      assert.ok(result.types?.includes("github_pull_request"));
    });

    it("should detect x.com as Twitter", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "posts on x.com");
      assert.ok(result);
      assert.deepEqual(result.types, ["x_tweet"]);
    });

    it("should handle queries with punctuation", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "What are my github repositories?");
      assert.ok(result);
      assert.ok(result.types?.includes("github_repository"));
    });

    it("should handle queries with extra whitespace", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "  github    repositories  ");
      assert.ok(result);
      assert.ok(result.types?.includes("github_repository"));
    });

    it("should use tags when provided", () => {
      service = new TypeFilterService();

      const result = service.inferTypes(["github", "github_repository"], "some query");
      assert.ok(result);
      assert.ok(result.types?.includes("github_repository"));
    });
  });
});
