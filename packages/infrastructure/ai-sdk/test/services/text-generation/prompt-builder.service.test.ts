import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PromptBuilderService } from "../../../src/services/generation/prompt-builder.service";
import type { ChatMessage } from "../../../src/types/chat";
import type { PromptComponents } from "../../../src/types/text-generation";

describe("PromptBuilderService", () => {
  describe("buildPrompt", () => {
    it("should build prompt with all components", () => {
      const service = new PromptBuilderService();

      const components: PromptComponents = {
        systemMessage: "You are a helpful assistant.",
        conversationHistory: "User: Hello\n\nAssistant: Hi there!",
        userMessage: "How are you?",
        toolResults: "## Tool Results\n- Data retrieved successfully",
      };

      const result = service.buildPrompt(components);

      assert.ok(result.includes("<system>\nYou are a helpful assistant.\n</system>"));
      assert.ok(result.includes("<history>\nUser: Hello\n\nAssistant: Hi there!\n</history>"));
      assert.ok(result.includes("<tool_results>\n## Tool Results\n- Data retrieved successfully\n</tool_results>"));
      assert.ok(result.includes("<user>\nHow are you?\n</user>"));
      assert.ok(result.includes("Assistant:"));
    });

    it("should build prompt without conversation history", () => {
      const service = new PromptBuilderService();

      const components: PromptComponents = {
        systemMessage: "You are a helpful assistant.",
        userMessage: "How are you?",
      };

      const result = service.buildPrompt(components);

      assert.ok(result.includes("<system>\nYou are a helpful assistant.\n</system>"));
      assert.ok(result.includes("<user>\nHow are you?\n</user>"));
      assert.ok(result.includes("Assistant:"));
      assert.ok(!result.includes("<history>"));
    });

    it("should build prompt without tool results", () => {
      const service = new PromptBuilderService();

      const components: PromptComponents = {
        systemMessage: "You are a helpful assistant.",
        conversationHistory: "User: Hello\n\nAssistant: Hi!",
        userMessage: "How are you?",
      };

      const result = service.buildPrompt(components);

      assert.ok(result.includes("<system>\nYou are a helpful assistant.\n</system>"));
      assert.ok(result.includes("<history>\nUser: Hello\n\nAssistant: Hi!\n</history>"));
      assert.ok(result.includes("<user>\nHow are you?\n</user>"));
      assert.ok(result.includes("Assistant:"));
      assert.ok(!result.includes("<tool_results>"));
    });

    it("should handle empty conversation history", () => {
      const service = new PromptBuilderService();

      const components: PromptComponents = {
        systemMessage: "You are a helpful assistant.",
        conversationHistory: "",
        userMessage: "How are you?",
      };

      const result = service.buildPrompt(components);

      assert.ok(result.includes("<system>\nYou are a helpful assistant.\n</system>"));
      assert.ok(result.includes("<user>\nHow are you?\n</user>"));
      assert.ok(!result.includes("<history>"));
    });

    it("should handle whitespace-only conversation history", () => {
      const service = new PromptBuilderService();

      const components: PromptComponents = {
        systemMessage: "You are a helpful assistant.",
        conversationHistory: "   \n   ",
        userMessage: "How are you?",
      };

      const result = service.buildPrompt(components);

      assert.ok(!result.includes("<history>"));
    });

    it("should handle intent-based style instructions", () => {
      const service = new PromptBuilderService();

      const components: PromptComponents = {
        systemMessage: "You are a helpful assistant.",
        userMessage: "Explain quantum physics.",
        intent: {
          requiredStyle: "concise",
        },
      };

      const result = service.buildPrompt(components);

      assert.ok(result.includes("Answer concisely. Avoid fluff. Be direct."));
    });
  });

  describe("buildMessages", () => {
    it("should build messages with conversation history", () => {
      const service = new PromptBuilderService();

      const history: ChatMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];

      const result = service.buildMessages("You are a helpful assistant.", history, "How are you?");

      assert.equal(result.length, 4); // system + 2 history + current user
      assert.equal(result[0].role, "system");
      assert.equal(result[0].content, "You are a helpful assistant.");
      assert.equal(result[1].role, "user");
      assert.equal(result[1].content, "Hello");
      assert.equal(result[2].role, "assistant");
      assert.equal(result[2].content, "Hi there!");
      assert.equal(result[3].role, "user");
      assert.equal(result[3].content, "How are you?");
    });

    it("should build messages without conversation history", () => {
      const service = new PromptBuilderService();

      const result = service.buildMessages("You are a helpful assistant.", undefined, "How are you?");

      assert.equal(result.length, 2); // system + current user
      assert.equal(result[0].role, "system");
      assert.equal(result[1].role, "user");
      assert.equal(result[1].content, "How are you?");
    });

    it("should build messages with empty conversation history", () => {
      const service = new PromptBuilderService();

      const result = service.buildMessages("You are a helpful assistant.", [], "How are you?");

      assert.equal(result.length, 2); // system + current user
      assert.equal(result[0].role, "system");
      assert.equal(result[1].role, "user");
    });

    it("should preserve message roles correctly", () => {
      const service = new PromptBuilderService();

      const history: ChatMessage[] = [
        { role: "user", content: "First" },
        { role: "assistant", content: "Second" },
        { role: "user", content: "Third" },
      ];

      const result = service.buildMessages("System", history, "Fourth");

      assert.equal(result.length, 5);
      assert.equal(result[1].role, "user");
      assert.equal(result[2].role, "assistant");
      assert.equal(result[3].role, "user");
      assert.equal(result[4].role, "user");
    });
  });
});
