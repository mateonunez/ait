import { z } from "zod";
import type { MCPClientManager, MCPTool, MCPToolResult, MCPVendor } from "../../mcp";
import type { Tool, ToolResult } from "../../types/tools";
import { jsonSchemaToZod } from "../../utils/mcp.schema.utils";
import { createTool } from "../../utils/tool.utils";

/**
 * Workflow hints for tools that require prerequisite information.
 * These help the LLM understand multi-step workflows AND correct parameter formats.
 */
const TOOL_WORKFLOW_HINTS: Record<MCPVendor, Record<string, string>> = {
  notion: {
    "API-post-search": `Search Notion pages by title.
REQUIREMENTS:
- Query must not be empty.
- Prefer tight queries first, broaden only if needed.
OUTPUT:
- Use the returned "id" as a page identifier.
COMMON PATTERN:
- Find parent page -> use its "id" as "parent.page_id" in API-post-page
- Find target page -> use its "id" as "page_id" in API-patch-page`,

    "API-post-page": `Create a new Notion page.
PREREQ:
- Always call API-post-search first to identify the parent page_id.
- If multiple candidate parents exist, list them briefly and ask the user to pick one.

FORMAT (with content):
{
  "parent": { "page_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
  "properties": {
    "title": [{ "text": { "content": "Page Title" } }]
  },
  "children": [
    { "paragraph": { "rich_text": [{ "text": { "content": "First paragraph." } }] } },
    { "heading_2": { "rich_text": [{ "text": { "content": "Section Title" } }] } },
    { "bulleted_list_item": { "rich_text": [{ "text": { "content": "Bullet item" } }] } },
    {
      "code": {
        "rich_text": [{ "text": { "content": "pnpm test" } }],
        "language": "bash"
      }
    }
  ]
}

RULES:
- Do NOT include a "type" field inside rich_text items
- Prefer simple blocks over complex ones, unless the user explicitly asks
- Keep children content concrete and scoped, do not dump entire context
- Available block types: paragraph, heading_1, heading_2, heading_3, bulleted_list_item, numbered_list_item, to_do, quote, code, table
- For tables: keep them small, 2 to 5 columns max, avoid wide tables`,

    "API-patch-page": `Update an existing Notion page.
PREREQ:
- Requires "page_id".
- First call API-post-search to find the page and get its id.
NOTES:
- Patch is for properties, not for adding blocks.
- If the user wants to append content blocks, create a new child page instead, or use the dedicated append blocks tool if available.`,

    "API-post-comment": `Add a comment to a Notion page.
PREREQ:
- First call API-post-search to find the target page and get its id.

FORMAT:
{
  "parent": { "page_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
  "rich_text": [{ "text": { "content": "Your comment" } }]
}

RULES:
- Keep comments short, actionable, and specific.
- Do NOT include a "type" field inside rich_text items.`,

    "API-post-database": `Create a Notion database.
PREREQ:
- Requires "parent.page_id".
- First call API-post-search to find a parent page and get its id.
WORKFLOW:
- Define properties first, then add rows separately (do not overload database creation with content).`,
  },

  github: {
    list_repos: `List repositories the token can access.
USE:
- Always call before create_branch, create_issue, create_pull_request unless owner/repo is already known with certainty.
OUTPUT:
- Choose the repo explicitly as { owner, repo }.`,

    create_issue: `Create a GitHub issue.
PREREQ:
- Requires "owner" and "repo".
- First call list_repos to discover valid repositories.
- If the repo is ambiguous, list top matches and ask the user to choose.

RULES:
- Title: short and concrete.
- Body: include context, acceptance criteria, and a minimal repro or steps if relevant.
- Add labels only if you know they exist, otherwise skip.`,

    create_pull_request: `Create a GitHub pull request.
PREREQ:
- Requires "owner" and "repo".
- Ensure the branch names are correct, ideally by listing branches first if the tool exists.
RULES:
- PR title should describe outcome, not activity.
- Body should include: what changed, why, risk, how to test.`,

    create_issue_comment: `Comment on an existing GitHub issue.
PREREQ:
- Requires "owner", "repo", "issue_number".
- First locate the issue via search or list issues if the tool exists.
RULES:
- Keep it tight, propose next step, ask one question only if needed.`,

    create_branch: `Create a GitHub branch.
PREREQ:
- Requires "owner" and "repo".
- First call list_repos to confirm.
- If a base ref is required, retrieve it first (main/master or default branch).
NAMING:
- Use kebab case, include intent, example: feat/rag-router, fix/oauth-timeout.`,
  },

  slack: {
    list_channels: `List Slack channels visible to the bot token.
USE:
- Always call before posting unless channel_id is already known.`,

    post_message: `Post a Slack message.
PREREQ:
- Requires "channel_id".
- First call list_channels to get the correct channel_id.
STYLE:
- 1 to 5 lines, concrete.
- If it's an announcement, include what changed, impact, and link if available.`,

    // Slack MCP server tool names are prefixed (e.g. slack_post_message).
    slack_list_channels: `List Slack channels visible to the bot token.
USE:
- Always call before posting unless channel_id is already known.`,

    slack_post_message: `Post a Slack message.
PREREQ:
- Requires "channel_id" and "text".
- If you only know a channel name like "#mcp-tests", call slack_list_channels first and find its id.
FORMAT:
{ "channel_id": "C01234567", "text": "Hello!" }`,

    post_thread_message: `Post a message in an existing Slack thread.
PREREQ:
- Requires "channel_id" and "thread_ts".
- First confirm channel_id via list_channels.
NOTES:
- thread_ts must be the parent message ts, not a reply ts.`,

    post_comment: `Alias for posting a message, same requirements as post_thread_message when used for threads.
PREREQ:
- Requires channel_id and potentially thread_ts, confirm tool signature before calling.`,

    post_comment_thread: `Alias for posting in a thread.
PREREQ:
- Requires channel_id and thread_ts.
- Confirm the correct thread_ts from the parent message.`,
  },

  linear: {
    list_projects: `List Linear projects and teams.
USE:
- Call this before creating issues if team or project is ambiguous.
OUTPUT:
- Select a team_id or project_id explicitly.`,

    create_issue: `Create a Linear issue.
PREREQ:
- Requires a team identifier (and project if applicable).
- First call list_projects or list_teams if available.
RULES:
- Title: outcome focused.
- Description: problem, constraints, acceptance criteria, and links.
- Priority only if the team uses it consistently.`,
  },
};

/**
 * Enrich a tool description with workflow hints if available
 */
function enrichDescription(toolName: string, vendor: MCPVendor, originalDescription?: string): string {
  const vendorHints = TOOL_WORKFLOW_HINTS[vendor];
  const hint = vendorHints?.[toolName];

  const baseDescription = originalDescription || `Execute ${toolName} on ${vendor}`;

  if (hint) {
    return `${baseDescription}. ${hint}`;
  }

  return baseDescription;
}

function convertMCPResultToToolResult(mcpResult: MCPToolResult): ToolResult {
  if (!mcpResult.success) {
    return {
      success: false,
      error: mcpResult.error || "Unknown error",
    };
  }

  // Extract text content from MCP result
  const textContent = mcpResult.content
    ?.filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("\n");

  return {
    success: true,
    data: textContent || mcpResult.content,
  };
}

/**
 * Convert a single MCP tool to AIt Tool format
 *
 * Enriches the description with workflow hints to help the LLM
 * understand multi-step workflows (e.g., search before create).
 */
export function convertMCPToolToAItTool(mcpTool: MCPTool, vendor: MCPVendor, manager: MCPClientManager): Tool {
  // Convert JSON Schema to Zod Schema if available, otherwise use passthrough
  // We cast to ZodSchema<any> because Tool expects a schema that produces Record<string, unknown>,
  // but jsonSchemaToZod returns generic ZodTypeAny. MCP input schemas are top-level objects.
  const parametersSchema = (
    mcpTool.inputSchema ? jsonSchemaToZod(mcpTool.inputSchema) : z.record(z.string(), z.any())
  ) as z.ZodSchema<any>;

  return createTool({
    description: enrichDescription(mcpTool.name, vendor, mcpTool.description),
    parameters: parametersSchema,
    execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
      const cleanParams = cleanToolParams(params);

      const result = await manager.executeTool(vendor, mcpTool.name, cleanParams);
      return convertMCPResultToToolResult(result);
    },
  });
}

function cleanToolParams(obj: any): any {
  if (obj === null || obj === "") {
    return undefined;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanToolParams).filter((val) => val !== undefined);
  }

  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanValue = cleanToolParams(value);
      if (cleanValue !== undefined) {
        result[key] = cleanValue;
      }
    }
    return result;
  }

  return obj;
}

export async function createMCPToolsForVendor(
  vendor: MCPVendor,
  manager: MCPClientManager,
): Promise<Record<string, Tool>> {
  if (!manager.isConnected(vendor)) {
    return {};
  }

  const mcpTools = await manager.listTools(vendor);
  const tools: Record<string, Tool> = {};

  for (const mcpTool of mcpTools) {
    const toolName = `${vendor}_${mcpTool.name}`;
    tools[toolName] = convertMCPToolToAItTool(mcpTool, vendor, manager);
  }

  return tools;
}

export async function createAllMCPTools(manager: MCPClientManager): Promise<Record<string, Tool>> {
  const connectedVendors = manager.getConnectedVendors();
  const allTools: Record<string, Tool> = {};

  for (const vendor of connectedVendors) {
    const vendorTools = await createMCPToolsForVendor(vendor, manager);
    Object.assign(allTools, vendorTools);
  }

  return allTools;
}

export function getMCPToolsSummary(manager: MCPClientManager): string {
  const connectedVendors = manager.getConnectedVendors();
  if (connectedVendors.length === 0) {
    return "No MCP servers connected";
  }

  const summaries: string[] = [];
  for (const vendor of connectedVendors) {
    const info = manager.getClientInfo(vendor);
    if (info) {
      const toolNames = info.tools.map((t) => t.name).join(", ");
      summaries.push(`${vendor}: ${info.tools.length} tools (${toolNames})`);
    }
  }

  return summaries.join("\n");
}
