import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TypeFilterService } from "../../../src/services/rag/type-filter.service";

describe("TypeFilterService", () => {
  let service: TypeFilterService;

  describe("detectTypeFilter", () => {
    it("should detect GitHub types for repository queries", () => {
      service = new TypeFilterService();

      const queries = [
        "show me github repositories",
        "my GitHub projects",
        "list all repos",
        "codebase information",
        "project repositories",
      ];

      for (const query of queries) {
        const result = service.detectTypeFilter(query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.deepEqual(result?.types, ["repository"]);
      }
    });

    it("should detect Linear types for issue queries", () => {
      service = new TypeFilterService();

      const queries = ["show linear issues", "my tasks in linear", "ticket status", "open issues", "task list"];

      for (const query of queries) {
        const result = service.detectTypeFilter(query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.deepEqual(result?.types, ["issue"]);
      }
    });

    it("should detect Spotify types for music queries", () => {
      service = new TypeFilterService();

      const queries = [
        "spotify playlists",
        "music tracks",
        "favorite songs",
        "artist albums",
        "what am I listening to",
      ];

      for (const query of queries) {
        const result = service.detectTypeFilter(query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.deepEqual(result?.types, ["track", "artist", "playlist", "album", "recently_played"]);
      }
    });

    it("should detect Twitter types for tweet queries", () => {
      service = new TypeFilterService();

      const queries = ["my tweets", "twitter posts", "tweet history", "x.com posts"];

      for (const query of queries) {
        const result = service.detectTypeFilter(query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.deepEqual(result?.types, ["tweet"]);
      }
    });

    it("should return undefined for generic queries", () => {
      service = new TypeFilterService();

      const queries = ["what have I been working on", "recent activity", "show me everything", "my data"];

      for (const query of queries) {
        const result = service.detectTypeFilter(query);
        assert.equal(result, undefined, `Should return undefined for: ${query}`);
      }
    });

    it("should not confuse domains (spotify query should not return github filter)", () => {
      service = new TypeFilterService();

      const result = service.detectTypeFilter("spotify tracks and albums");
      assert.ok(result);
      assert.deepEqual(result.types, ["track", "artist", "playlist", "album", "recently_played"]);
      assert.notDeepEqual(result.types, ["repository"]);
    });

    it("should prioritize Spotify over GitHub when both keywords present", () => {
      service = new TypeFilterService();

      // Edge case: someone might say "github playlist" but we should detect Spotify
      const result = service.detectTypeFilter("playlist from github");
      assert.ok(result);
      assert.deepEqual(result.types, ["track", "artist", "playlist", "album", "recently_played"]);
    });

    it("should be case insensitive", () => {
      service = new TypeFilterService();

      const result1 = service.detectTypeFilter("GITHUB REPOSITORIES");
      const result2 = service.detectTypeFilter("GitHub Repositories");
      const result3 = service.detectTypeFilter("github repositories");

      assert.deepEqual(result1?.types, ["repository"]);
      assert.deepEqual(result2?.types, ["repository"]);
      assert.deepEqual(result3?.types, ["repository"]);
    });

    it("should handle multiple type keywords in same domain", () => {
      service = new TypeFilterService();

      const result = service.detectTypeFilter("github repositories and projects and code");
      assert.ok(result);
      assert.deepEqual(result.types, ["repository"]);
    });

    it("should detect x.com as Twitter", () => {
      service = new TypeFilterService();

      const result = service.detectTypeFilter("posts on x.com");
      assert.ok(result);
      assert.deepEqual(result.types, ["tweet"]);
    });

    it("should handle queries with punctuation", () => {
      service = new TypeFilterService();

      const result = service.detectTypeFilter("What are my github repositories?");
      assert.ok(result);
      assert.deepEqual(result.types, ["repository"]);
    });

    it("should handle queries with extra whitespace", () => {
      service = new TypeFilterService();

      const result = service.detectTypeFilter("  github    repositories  ");
      assert.ok(result);
      assert.deepEqual(result.types, ["repository"]);
    });
  });
});
