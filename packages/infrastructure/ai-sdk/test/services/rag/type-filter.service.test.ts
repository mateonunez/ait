import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TypeFilterService } from "../../../src/services/rag/type-filter.service";

describe("TypeFilterService", () => {
  let service: TypeFilterService;

  describe("inferTypes", () => {
    it("should detect GitHub types for repository queries", () => {
      service = new TypeFilterService();

      const queries = [
        "show me github repositories",
        "my GitHub pull requests",
        "list all repository",
        "code information",
        "git commits",
      ];

      for (const query of queries) {
        const result = service.inferTypes([], query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.ok(result?.types?.includes("repository"), `Should include repository for: ${query}`);
        assert.ok(result?.types?.includes("pull_request"), `Should include pull_request for: ${query}`);
      }
    });

    it("should detect Linear types for issue queries", () => {
      service = new TypeFilterService();

      const queries = ["show linear issue", "my tasks in linear", "ticket status", "bug tracker", "task list"];

      for (const query of queries) {
        const result = service.inferTypes([], query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.deepEqual(result?.types, ["issue"]);
      }
    });

    it("should detect Spotify types for music queries", () => {
      service = new TypeFilterService();

      const queries = ["spotify playlists", "music track", "favorite song", "artist album", "what am I listening to"];

      for (const query of queries) {
        const result = service.inferTypes([], query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.deepEqual(result?.types, ["track", "artist", "playlist", "album", "recently_played"]);
      }
    });

    it("should detect Twitter types for tweet queries", () => {
      service = new TypeFilterService();

      const queries = ["my tweet", "twitter posts", "posted on twitter", "x.com posts"];

      for (const query of queries) {
        const result = service.inferTypes([], query);
        assert.ok(result, `Should detect filter for: ${query}`);
        assert.deepEqual(result?.types, ["tweet"]);
      }
    });

    it("should return undefined for generic queries", () => {
      service = new TypeFilterService();

      const queries = ["what have I been working on", "recent activity", "show me everything", "my data"];

      for (const query of queries) {
        const result = service.inferTypes([], query);
        assert.equal(result, undefined, `Should return undefined for: ${query}`);
      }
    });

    it("should not confuse domains (spotify query should not return github filter)", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "spotify tracks and albums");
      assert.ok(result);
      assert.deepEqual(result.types, ["track", "artist", "playlist", "album", "recently_played"]);
      assert.ok(!result.types.includes("repository"), "Should not include repository");
    });

    it("should detect multiple domains when both keywords present", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "playlist from github repositories");
      assert.ok(result);
      // Should detect both music and code types
      assert.ok(result.types?.includes("playlist"), "Should include playlist");
      assert.ok(result.types?.includes("repository"), "Should include repository");
    });

    it("should be case insensitive", () => {
      service = new TypeFilterService();

      const result1 = service.inferTypes([], "GITHUB REPOSITORIES");
      const result2 = service.inferTypes([], "GitHub Repositories");
      const result3 = service.inferTypes([], "github repositories");

      assert.ok(result1?.types?.includes("repository"));
      assert.ok(result2?.types?.includes("repository"));
      assert.ok(result3?.types?.includes("repository"));
    });

    it("should handle multiple type keywords in same domain", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "github repositories and projects and code");
      assert.ok(result);
      assert.ok(result.types?.includes("repository"));
      assert.ok(result.types?.includes("pull_request"));
    });

    it("should detect x.com as Twitter", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "posts on x.com");
      assert.ok(result);
      assert.deepEqual(result.types, ["tweet"]);
    });

    it("should handle queries with punctuation", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "What are my github repositories?");
      assert.ok(result);
      assert.ok(result.types?.includes("repository"));
    });

    it("should handle queries with extra whitespace", () => {
      service = new TypeFilterService();

      const result = service.inferTypes([], "  github    repositories  ");
      assert.ok(result);
      assert.ok(result.types?.includes("repository"));
    });

    it("should use LLM intent when provided", () => {
      service = new TypeFilterService();

      const intent = {
        entityTypes: ["track", "recently_played"],
        isTemporalQuery: false,
        primaryFocus: "some query",
      };

      const result = service.inferTypes([], "some query", { intent });
      assert.ok(result);
      assert.deepEqual(result.types, ["track", "recently_played"]);
    });

    it("should use tags when provided", () => {
      service = new TypeFilterService();

      const result = service.inferTypes(["github", "repository"], "some query");
      assert.ok(result);
      assert.ok(result.types?.includes("repository"));
    });
  });
});
