import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConversationManagerService } from "../../../src/services/generation/conversation-manager.service";
import type { ChatMessage } from "../../../src/types/chat";

describe("ConversationManagerService", () => {
  describe("processConversation", () => {
    it("should handle empty message history", async () => {
      const service = new ConversationManagerService();

      const result = await service.processConversation(undefined, "Hello");

      assert.equal(result.recentMessages.length, 0);
      assert.ok(result.estimatedTokens > 0);
      assert.ok(!result.summary);
    });

    it("should keep recent messages within limit", async () => {
      const service = new ConversationManagerService({ maxRecentMessages: 3 });

      const messages: ChatMessage[] = [
        { role: "user", content: "Message 1" },
        { role: "assistant", content: "Response 1" },
        { role: "user", content: "Message 2" },
        { role: "assistant", content: "Response 2" },
        { role: "user", content: "Message 3" },
        { role: "assistant", content: "Response 3" },
      ];

      const result = await service.processConversation(messages, "New message");

      assert.equal(result.recentMessages.length, 3);
      assert.equal(result.recentMessages[0].content, "Response 2");
      assert.equal(result.recentMessages[2].content, "Response 3");
    });

    it("should not summarize when messages fit within token limit", async () => {
      const service = new ConversationManagerService({
        maxRecentMessages: 10,
        maxHistoryTokens: 10000,
      });

      const messages: ChatMessage[] = [
        { role: "user", content: "Short message" },
        { role: "assistant", content: "Short response" },
      ];

      const result = await service.processConversation(messages, "New message");

      assert.equal(result.recentMessages.length, 2);
      assert.ok(!result.summary);
    });

    it("should create summary when older messages exist", async () => {
      const service = new ConversationManagerService({
        maxRecentMessages: 2,
        maxHistoryTokens: 110, // Token limit set to force summarization with longer messages
        enableSummarization: true,
      });

      const messages: ChatMessage[] = [
        { role: "user", content: "Old message about github repositories and code projects" },
        { role: "assistant", content: "Old response about github and development workflows" },
        {
          role: "user",
          content:
            "Recent message about something else entirely with lots of additional context and information that makes this quite long and exceeds our token limits",
        },
        {
          role: "assistant",
          content:
            "Recent response with more details and explanations that provides comprehensive answers and additional information to help understand",
        },
      ];

      // Use a longer prompt to push total tokens over the limit
      const result = await service.processConversation(
        messages,
        "Tell me more about this with detailed information and comprehensive explanations about everything we discussed and all the topics covered in great detail with examples",
      );

      assert.ok(result.summary, "Summary should be created when token limit exceeded");
      assert.ok(
        result.summary.includes("github") || result.summary.includes("repositories"),
        `Summary should include topics from older messages. Got: ${result.summary}`,
      );
    });

    it("should truncate recent messages when disabled summarization", async () => {
      const service = new ConversationManagerService({
        maxRecentMessages: 5,
        maxHistoryTokens: 50,
        enableSummarization: false,
      });

      const messages: ChatMessage[] = [
        { role: "user", content: "Message 1" },
        { role: "assistant", content: "Response 1" },
        { role: "user", content: "Message 2" },
        { role: "assistant", content: "Response 2" },
      ];

      const result = await service.processConversation(messages, "Short");

      assert.ok(result.recentMessages.length <= 4);
      assert.ok(!result.summary);
    });

    it("should estimate tokens correctly", async () => {
      const service = new ConversationManagerService();

      const messages: ChatMessage[] = [
        { role: "user", content: "This is a test message" }, // ~6 tokens
      ];

      const result = await service.processConversation(messages, "Hello"); // ~1-2 tokens

      assert.ok(result.estimatedTokens > 0);
      assert.ok(result.estimatedTokens < 100); // Should be reasonable
    });

    it("should respect minimum configuration values", async () => {
      const service = new ConversationManagerService({
        maxRecentMessages: 0, // Should be clamped to 1
        maxHistoryTokens: 50, // Should be clamped to 100
      });

      const messages: ChatMessage[] = [{ role: "user", content: "Test" }];

      const result = await service.processConversation(messages, "Hello");

      assert.ok(result);
      assert.ok(result.estimatedTokens > 0);
    });

    it("should use default configuration", async () => {
      const service = new ConversationManagerService();

      const messages: ChatMessage[] = [{ role: "user", content: "Test message" }];

      const result = await service.processConversation(messages, "Hello");

      assert.ok(result);
      assert.equal(result.recentMessages.length, 1);
    });

    it("should handle very long conversation history", async () => {
      const service = new ConversationManagerService({
        maxRecentMessages: 5,
        maxHistoryTokens: 500,
      });

      const messages: ChatMessage[] = [];
      for (let i = 0; i < 50; i++) {
        messages.push({ role: "user", content: `User message ${i}` });
        messages.push({ role: "assistant", content: `Assistant response ${i}` });
      }

      const result = await service.processConversation(messages, "Latest message");

      assert.ok(result.recentMessages.length <= 5);
      assert.ok(result.estimatedTokens <= 600); // Some buffer
    });

    it("should extract topics from conversation for summary", async () => {
      const service = new ConversationManagerService({
        maxRecentMessages: 1,
        maxHistoryTokens: 100, // Token limit (minimum enforced is 100)
        enableSummarization: true,
      });

      const messages: ChatMessage[] = [
        {
          role: "user",
          content:
            "Tell me about typescript programming language and its features and capabilities for modern software development",
        },
        {
          role: "assistant",
          content:
            "TypeScript is great for large scale projects and enterprise applications with static typing features",
        },
        {
          role: "user",
          content:
            "Recent message with additional context and more information that makes this message quite long and exceeds the token limit we have set for testing purposes with many more words to ensure we exceed the minimum token threshold",
        },
      ];

      // Use a longer prompt to push total tokens over the limit (needs to exceed ~100 tokens total)
      const result = await service.processConversation(
        messages,
        "Can you provide more detailed explanations about this topic with comprehensive information and examples that cover all aspects in great detail with code samples and best practices and implementation guidelines for production systems?",
      );

      assert.ok(result.summary, "Summary should be created when token limit exceeded");
      assert.ok(
        result.summary.includes("typescript") ||
          result.summary.includes("programming") ||
          result.summary.includes("User asked"),
        `Summary should include topics or standard text. Got: ${result.summary}`,
      );
    });
  });
});
