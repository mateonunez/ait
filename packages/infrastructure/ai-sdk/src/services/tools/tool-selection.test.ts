import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectToolsForPrompt } from "./tool-selection";

function tool(): any {
  return { description: "x", parameters: {}, execute: async () => ({}) };
}

describe("selectToolsForPrompt", () => {
  it("should keep only internal + vendor-relevant tools", () => {
    const tools = {
      chat_list_my_conversations: tool(),
      chat_get_my_conversation: tool(),
      "notion_API-post-search": tool(),
      "notion_API-post-page": tool(),
      slack_slack_post_message: tool(),
      github_create_issue: tool(),
      linear_linear_create_issue: tool(),
      getCurrentlyPlaying: tool(),
    };

    const result = selectToolsForPrompt({
      prompt: "Crea una pagina su Notion e invia un messaggio su Slack",
      inferredTypes: ["page", "message"],
      tools,
    });

    assert.equal(result.writeEnabled, true);
    assert.ok(result.selectedToolNames.includes("chat_list_my_conversations"));
    assert.ok(result.selectedToolNames.includes("notion_API-post-search"));
    assert.ok(result.selectedToolNames.includes("slack_slack_post_message"));
    assert.ok(!result.selectedToolNames.includes("github_create_issue"));
    assert.ok(!result.selectedToolNames.includes("linear_linear_create_issue"));
    assert.ok(!result.selectedToolNames.includes("getCurrentlyPlaying"));
  });
});
