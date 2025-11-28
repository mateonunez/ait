import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { QueryRewriterService } from "../../src/services/generation/query-rewriter.service";
import type { AItClient } from "../../src/client/ai-sdk.client";

describe("QueryRewriterService", () => {
  let service: QueryRewriterService;
  let mockGenerateText: any;
  let mockClient: AItClient;

  beforeEach(() => {
    mockGenerateText = mock.fn();
    mockClient = {
      generateText: mockGenerateText,
    } as unknown as AItClient;
    service = new QueryRewriterService(mockClient);
  });

  it("should return original query if no messages provided", async () => {
    const query = "test query";
    const result = await service.rewriteQuery(query, []);
    assert.equal(result, query);
    assert.equal(mockGenerateText.mock.callCount(), 0);
  });

  it("should call LLM to rewrite query when messages are present", async () => {
    const query = "Who of them do I listen on Spotify?";
    const messages = [
      { role: "user", content: "Show me my YouTube subscriptions" },
      { role: "assistant", content: "Here are your subscriptions: Artist A, Artist B" },
    ] as any[];

    mockGenerateText.mock.mockImplementationOnce(async () => ({
      text: "Who of Artist A, Artist B do I listen on Spotify?",
    }));

    const result = await service.rewriteQuery(query, messages);

    assert.equal(mockGenerateText.mock.callCount(), 1);
    const callArgs = mockGenerateText.mock.calls[0].arguments[0];
    assert.ok(callArgs.prompt.includes('Rewrite the "Current User Query"'));
    assert.equal(callArgs.temperature, 0.1);
    assert.equal(result, "Who of Artist A, Artist B do I listen on Spotify?");
  });

  it("should return original query if LLM fails", async () => {
    const query = "test query";
    const messages = [{ role: "user", content: "hi" }] as any[];

    mockGenerateText.mock.mockImplementationOnce(async () => {
      throw new Error("LLM error");
    });

    const result = await service.rewriteQuery(query, messages);
    assert.equal(result, query);
  });
});
