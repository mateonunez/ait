import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { McpToolRegistry } from "./mcp-tool-registry";

describe("McpToolRegistry", () => {
  it("should produce prefixed tools with metadata-enriched descriptions", async () => {
    const fakeManager: any = {
      getConnectedVendors: () => ["slack", "notion", "github", "linear"],
      listTools: async (vendor: string) => {
        if (vendor === "slack") {
          return [
            {
              name: "slack_list_channels",
              description: "List channels",
              inputSchema: { type: "object", properties: {} },
            },
            {
              name: "slack_post_message",
              description: "Post message",
              inputSchema: {
                type: "object",
                properties: { channel_id: { type: "string" }, text: { type: "string" } },
                required: ["channel_id", "text"],
              },
            },
          ];
        }
        if (vendor === "notion") {
          return [
            { name: "API-post-search", description: "Search pages", inputSchema: { type: "object", properties: {} } },
            { name: "API-post-page", description: "Create page", inputSchema: { type: "object", properties: {} } },
          ];
        }
        if (vendor === "github") {
          return [{ name: "list_repos", description: "List repos", inputSchema: { type: "object", properties: {} } }];
        }
        return [
          { name: "list_projects", description: "List projects", inputSchema: { type: "object", properties: {} } },
        ];
      },
      executeTool: async (_vendor: string, _toolName: string, _args: any) => ({
        success: true,
        content: [{ type: "text", text: '{"ok":true}' }],
      }),
    };

    const registry = new McpToolRegistry({ manager: fakeManager });
    const tools = await registry.getToolsForConnectedVendors();

    assert.ok(tools.slack_slack_post_message);
    assert.ok(tools["notion_API-post-search"]);

    const slackTool: any = tools.slack_slack_post_message;
    assert.ok(typeof slackTool.description === "string");
    assert.ok(slackTool.description.includes("PRECONDITIONS"));
    assert.ok(slackTool.description.includes("channel_id"));
  });
});
