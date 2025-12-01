import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import type { AItClient } from "../../../src/client/ai-sdk.client";
import { ConversationManagerService } from "../../../src/services/generation/conversation-manager.service";
import type { ITokenEstimationService } from "../../../src/services/metadata/token-estimation.service";
import type { ChatMessage } from "../../../src/types";

describe("ConversationManagerService", () => {
  const mockGenerateText = mock.fn<(...args: any[]) => Promise<any>>();

  const mockClient = {
    generateText: mockGenerateText as unknown as <T>(options: any) => Promise<T>,
  } as unknown as AItClient;

  const mockTokenEstimator = {
    estimateTokens: mock.fn((text: string) => text.length / 4),
    estimateTokensForMessages: mock.fn((messages: any[]) => messages.length * 10),
  } as unknown as ITokenEstimationService;

  afterEach(() => {
    mockGenerateText.mock.resetCalls();
  });

  it("should summarize older messages when limit exceeded", async () => {
    const service = new ConversationManagerService(
      { maxRecentMessages: 2, maxHistoryTokens: 100, enableSummarization: true },
      mockTokenEstimator,
      mockClient,
    );

    const messages = [
      { role: "user" as const, content: "old message 1" },
      { role: "assistant" as const, content: "old response 1" },
      { role: "user" as const, content: "recent message 1" },
      { role: "assistant" as const, content: "recent response 1" },
    ];

    mockGenerateText.mock.mockImplementationOnce(async () => ({
      text: "Summary of old messages",
    }));

    const result = await service.processConversation(messages, "new prompt");

    assert.equal(result.summary, "Summary of old messages");
    assert.equal(result.recentMessages.length, 2);
    assert.equal(mockGenerateText.mock.callCount(), 1);
  });

  it("should fallback to concatenation on LLM failure", async () => {
    const service = new ConversationManagerService(
      { maxRecentMessages: 2, maxHistoryTokens: 100, enableSummarization: true },
      mockTokenEstimator,
      mockClient,
    );

    const messages = [
      { role: "user" as const, content: "old message 1" },
      { role: "assistant" as const, content: "old response 1" },
      { role: "user" as const, content: "recent message 1" },
      { role: "assistant" as const, content: "recent response 1" },
    ] as ChatMessage[];

    mockGenerateText.mock.mockImplementationOnce(async () => {
      throw new Error("API Error");
    });

    const result = await service.processConversation(messages, "new prompt");

    assert.ok(result.summary?.includes("History summary"));
    assert.equal(result.recentMessages.length, 2);
  });

  it("should not summarize if within limits", async () => {
    const service = new ConversationManagerService(
      { maxRecentMessages: 10, maxHistoryTokens: 1000, enableSummarization: true },
      mockTokenEstimator,
      mockClient,
    );

    const messages = [
      { role: "user", content: "recent message 1" },
      { role: "assistant", content: "recent response 1" },
    ] as ChatMessage[];

    const result = await service.processConversation(messages, "new prompt");

    assert.equal(result.summary, undefined);
    assert.equal(result.recentMessages.length, 2);
    assert.equal(mockGenerateText.mock.callCount(), 0);
  });
});
