import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { RepositoryFileTextTokenizer } from "./code-text.tokenizer";
import { DefaultTextTokenizer } from "./default-text.tokenizer";
import { getTextTokenizer, isCodeEntityType, resetTextTokenizers } from "./text-tokenizer.factory";

describe("Text Tokenization Strategies", () => {
  beforeEach(() => {
    resetTextTokenizers();
  });

  describe("DefaultTextTokenizer", () => {
    it("should tokenize basic text", () => {
      const tokenizer = new DefaultTextTokenizer();
      const result = tokenizer.tokenize("Hello World Test");

      assert.strictEqual(result.has("hello"), true);
      assert.strictEqual(result.has("world"), true);
      assert.strictEqual(result.has("test"), true);
    });

    it("should filter short words", () => {
      const tokenizer = new DefaultTextTokenizer();
      const result = tokenizer.tokenize("a to the hello");

      assert.strictEqual(result.has("a"), false);
      assert.strictEqual(result.has("to"), false);
      assert.strictEqual(result.has("the"), true);
      assert.strictEqual(result.has("hello"), true);
    });

    it("should return 'default' as name", () => {
      const tokenizer = new DefaultTextTokenizer();
      assert.strictEqual(tokenizer.getName(), "default");
    });
  });

  describe("RepositoryFileTextTokenizer", () => {
    it("should split camelCase identifiers", () => {
      const tokenizer = new RepositoryFileTextTokenizer();
      const result = tokenizer.tokenize("getUserById");

      assert.strictEqual(result.has("get"), true);
      assert.strictEqual(result.has("user"), true);
      assert.strictEqual(result.has("by"), true);
      assert.strictEqual(result.has("id"), true);
      assert.strictEqual(result.has("getuserbyid"), true);
    });

    it("should split snake_case identifiers", () => {
      const tokenizer = new RepositoryFileTextTokenizer();
      const result = tokenizer.tokenize("get_user_by_id");

      assert.strictEqual(result.has("get"), true);
      assert.strictEqual(result.has("user"), true);
      assert.strictEqual(result.has("by"), true);
      assert.strictEqual(result.has("id"), true);
    });

    it("should split kebab-case identifiers", () => {
      const tokenizer = new RepositoryFileTextTokenizer();
      const result = tokenizer.tokenize("get-user-by-id");

      assert.strictEqual(result.has("get"), true);
      assert.strictEqual(result.has("user"), true);
      assert.strictEqual(result.has("by"), true);
      assert.strictEqual(result.has("id"), true);
    });

    it("should handle mixed code patterns", () => {
      const tokenizer = new RepositoryFileTextTokenizer();
      const result = tokenizer.tokenize("fetchUserData get_config my-component");

      assert.strictEqual(result.has("fetch"), true);
      assert.strictEqual(result.has("user"), true);
      assert.strictEqual(result.has("data"), true);
      assert.strictEqual(result.has("get"), true);
      assert.strictEqual(result.has("config"), true);
      assert.strictEqual(result.has("my"), true);
      assert.strictEqual(result.has("component"), true);
    });

    it("should return 'github_file' as name", () => {
      const tokenizer = new RepositoryFileTextTokenizer();
      assert.strictEqual(tokenizer.getName(), "github_file");
    });
  });

  describe("getTextTokenizer Factory", () => {
    it("should return DefaultTextTokenizer for undefined entity type", () => {
      const tokenizer = getTextTokenizer();
      assert.strictEqual(tokenizer.getName(), "default");
    });

    it("should return RepositoryFileTextTokenizer for repository_file entity", () => {
      const tokenizer = getTextTokenizer("github_file");
      assert.strictEqual(tokenizer.getName(), "github_file");
    });

    it("should return RepositoryFileTextTokenizer for commit entity", () => {
      const tokenizer = getTextTokenizer("github_commit");
      assert.strictEqual(tokenizer.getName(), "github_file");
    });

    it("should return RepositoryFileTextTokenizer for pull_request entity", () => {
      const tokenizer = getTextTokenizer("github_pull_request");
      assert.strictEqual(tokenizer.getName(), "github_file");
    });

    it("should return DefaultTextTokenizer for non-code entities", () => {
      assert.strictEqual(getTextTokenizer("spotify_track").getName(), "default");
      assert.strictEqual(getTextTokenizer("spotify_playlist").getName(), "default");
      assert.strictEqual(getTextTokenizer("notion_page").getName(), "default");
      assert.strictEqual(getTextTokenizer("slack_message").getName(), "default");
    });
  });

  describe("isCodeEntityType", () => {
    it("should return true for code entity types", () => {
      assert.strictEqual(isCodeEntityType("github_file"), true);
      assert.strictEqual(isCodeEntityType("github_commit"), true);
      assert.strictEqual(isCodeEntityType("github_pull_request"), true);
      assert.strictEqual(isCodeEntityType("github_repository"), true);
    });

    it("should return false for non-code entity types", () => {
      assert.strictEqual(isCodeEntityType("spotify_track"), false);
      assert.strictEqual(isCodeEntityType("spotify_playlist"), false);
      assert.strictEqual(isCodeEntityType("notion_page"), false);
      assert.strictEqual(isCodeEntityType("slack_message"), false);
    });
  });
});
