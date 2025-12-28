import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeToolsAsync } from "./tool-router";

function tool(): any {
  return { description: "x", parameters: {}, execute: async () => ({}) };
}

describe("routeToolsAsync", () => {
  it("should fall back to semantic routing when types are empty", async () => {
    const tools = {
      chat_list_my_conversations: tool(),
      chat_get_my_conversation: tool(),
      getCurrentlyPlaying: tool(),
      slack_slack_post_message: tool(),
    };

    const result = await routeToolsAsync({
      prompt: "Ciao, invia un messaggio su Slack",
      inferredTypes: [],
      tools,
    });

    assert.ok(result.selectedToolNames.includes("chat_list_my_conversations"));
  });
});
