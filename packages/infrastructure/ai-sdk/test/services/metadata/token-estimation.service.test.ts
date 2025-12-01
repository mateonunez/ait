import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { TokenEstimationService } from "../../../src/services/metadata/token-estimation.service";
import type { ChatMessage } from "../../../src/types/chat";

describe("TokenEstimationService", () => {
  let service: TokenEstimationService;

  beforeEach(() => {
    service = new TokenEstimationService();
  });

  describe("estimateTokens", () => {
    it("should estimate tokens for simple text", () => {
      const text = "Hello world this is a test";
      const tokens = service.estimateTokens(text);

      // ~4 chars per token, so 26 chars / 4 = ~7 tokens
      assert.ok(tokens >= 6 && tokens <= 8);
    });

    it("should return 0 for empty text", () => {
      assert.equal(service.estimateTokens(""), 0);
    });

    it("should handle longer text", () => {
      const text = "A".repeat(400);
      const tokens = service.estimateTokens(text);

      // 400 chars / 4 = 100 tokens
      assert.equal(tokens, 100);
    });
  });

  describe("estimateTokensForMessages", () => {
    it("should estimate tokens for chat messages", () => {
      const messages: ChatMessage[] = [
        { role: "user", content: "Hello", createdAt: new Date() },
        { role: "assistant", content: "Hi there", createdAt: new Date() },
      ];

      const tokens = service.estimateTokensForMessages(messages);

      // "user: Hello" (11 chars) + "assistant: Hi there" (19 chars) + overhead (8)
      // Total: ~38 chars / 4 + 8 = ~18 tokens
      assert.ok(tokens >= 15 && tokens <= 20);
    });

    it("should return 0 for empty messages array", () => {
      const tokens = service.estimateTokensForMessages([]);
      assert.equal(tokens, 0);
    });

    it("should account for message overhead", () => {
      const singleMessage: ChatMessage[] = [{ role: "user", content: "Hi", createdAt: new Date() }];

      const tokens = service.estimateTokensForMessages(singleMessage);

      // "user: Hi" (8 chars) / 4 + 4 overhead = 6 tokens
      assert.ok(tokens >= 5 && tokens <= 7);
    });
  });

  describe("custom characters per token", () => {
    it("should respect custom charactersPerToken setting", () => {
      const customService = new TokenEstimationService(2); // 2 chars per token
      const text = "1234567890"; // 10 chars

      const tokens = customService.estimateTokens(text);
      assert.equal(tokens, 5); // 10 / 2 = 5
    });

    it("should enforce minimum of 1 character per token", () => {
      const invalidService = new TokenEstimationService(0);
      const text = "Hello";

      const tokens = invalidService.estimateTokens(text);
      assert.equal(tokens, 5); // 5 chars / 1 = 5
    });
  });
});
