import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TextNormalizationService } from "../../../src/services/metadata/text-normalization.service";

describe("TextNormalizationService", () => {
  let service: TextNormalizationService;

  beforeEach(() => {
    service = new TextNormalizationService();
  });

  describe("normalizeForMatching", () => {
    it("should lowercase and remove punctuation", () => {
      const text = "Hello, World! This is a TEST.";
      const normalized = service.normalizeForMatching(text);

      assert.equal(normalized, "hello world this is a test");
    });

    it("should handle quotes and special characters", () => {
      const text = '"GitHub" repo\'s @mention #hashtag';
      const normalized = service.normalizeForMatching(text);

      assert.equal(normalized, "github repos mention hashtag");
    });

    it("should normalize multiple spaces", () => {
      const text = "hello    world    test";
      const normalized = service.normalizeForMatching(text);

      assert.equal(normalized, "hello world test");
    });

    it("should return empty string for empty input", () => {
      assert.equal(service.normalizeForMatching(""), "");
    });
  });

  describe("cleanPageContent", () => {
    it("should remove JSON-like content", () => {
      const content = "Some text {json: data} more text";
      const cleaned = service.cleanPageContent(content);

      assert.equal(cleaned, "Some text more text");
    });

    it("should remove URLs", () => {
      const content = "Check this out https://example.com and http://test.org";
      const cleaned = service.cleanPageContent(content);

      assert.equal(cleaned, "Check this out and");
    });

    it("should remove brackets", () => {
      const content = "Text with [metadata] and more [info]";
      const cleaned = service.cleanPageContent(content);

      assert.equal(cleaned, "Text with and more");
    });

    it("should normalize whitespace", () => {
      const content = "Text    with    lots    of    spaces";
      const cleaned = service.cleanPageContent(content);

      assert.equal(cleaned, "Text with lots of spaces");
    });
  });

  describe("isNaturalText", () => {
    it("should return true for natural language text", () => {
      const text = "This is a natural language sentence.";
      assert.ok(service.isNaturalText(text));
    });

    it("should return false for text with JSON", () => {
      const text = "Text with {json: data}";
      assert.ok(!service.isNaturalText(text));
    });

    it("should return false for text with URLs", () => {
      const text = "Check https://example.com";
      assert.ok(!service.isNaturalText(text));
    });

    it("should return false for short text", () => {
      const text = "Short";
      assert.ok(!service.isNaturalText(text));
    });

    it("should return false for empty text", () => {
      assert.ok(!service.isNaturalText(""));
    });
  });

  describe("truncate", () => {
    it("should truncate long text", () => {
      const text = "A".repeat(100);
      const truncated = service.truncate(text, 50);

      assert.equal(truncated.length, 53); // 50 + "..."
      assert.ok(truncated.endsWith("..."));
    });

    it("should not truncate short text", () => {
      const text = "Short text";
      const truncated = service.truncate(text, 50);

      assert.equal(truncated, text);
    });

    it("should handle empty text", () => {
      assert.equal(service.truncate("", 50), "");
    });
  });

  describe("extractKeywords", () => {
    it("should extract keywords from text", () => {
      const text = "What music did I listen to yesterday?";
      const keywords = service.extractKeywords(text);

      assert.ok(keywords.has("what music did i listen to yesterday"));
      assert.ok(keywords.has("music"));
      assert.ok(keywords.has("listen"));
      assert.ok(keywords.has("yesterday"));
    });

    it("should skip single character tokens", () => {
      const text = "a b c longer words here";
      const keywords = service.extractKeywords(text);

      assert.ok(!keywords.has("a"));
      assert.ok(!keywords.has("b"));
      assert.ok(keywords.has("longer"));
      assert.ok(keywords.has("words"));
    });

    it("should return empty set for empty text", () => {
      const keywords = service.extractKeywords("");
      assert.equal(keywords.size, 0);
    });

    it("should handle punctuation correctly", () => {
      const text = "recently-played, tracks!";
      const keywords = service.extractKeywords(text);

      assert.ok(keywords.has("recently-played tracks"));
      assert.ok(keywords.has("recently-played"));
      assert.ok(keywords.has("tracks"));
    });
  });

  describe("custom configuration", () => {
    it("should respect custom minNaturalTextLength", () => {
      const customService = new TextNormalizationService(20);

      assert.ok(!customService.isNaturalText("Short text here"));
      assert.ok(customService.isNaturalText("This is a longer text that exceeds twenty characters"));
    });
  });
});
