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
OUTPUT:
- Use the returned "id" as a page identifier.

TYPE RULES:
- query: string

COMMON PATTERN:
- Find parent page -> use its "id" as "parent.page_id" in API-post-page
- Find target page -> use its "id" as "page_id" in API-patch-page`,
    "API-post-page": `Create a new Notion page.
PREREQ:
- Always call API-post-search first to identify the parent page_id.

TYPE RULES:
- parent.page_id: string
- properties.title[].text.content: string
- children: array of blocks

RULES:
- Do NOT include a "type" field inside rich_text items`,
    "API-patch-page": `Update an existing Notion page.
PREREQ:
- Requires "page_id".
- First call API-post-search to find the page and get its id.

TYPE RULES:
- page_id: string`,
    "API-post-comment": `Add a comment to a Notion page.
PREREQ:
- First call API-post-search to find the target page and get its id.

TYPE RULES:
- parent.page_id: string
- rich_text[].text.content: string`,
    "API-post-database": `Create a Notion database.
PREREQ:
- Requires "parent.page_id".
- First call API-post-search to find a parent page and get its id.

TYPE RULES:
- parent.page_id: string`,
  },

  github: {
    list_repos: "List repositories the token can access.",
    create_issue: `Create a GitHub issue.
PREREQ:
- Requires "owner" and "repo".

TYPE RULES:
- owner: string
- repo: string
- title: string
- body: string (optional)
- labels: array of strings (optional)`,
    create_pull_request: `Create a GitHub pull request.
TYPE RULES:
- owner: string
- repo: string
- title: string
- head: string
- base: string`,
    create_issue_comment: `Comment on an existing GitHub issue.
TYPE RULES:
- owner: string
- repo: string
- issue_number: number
- body: string

BAD:
{ "issue_number": "123" }

GOOD:
{ "issue_number": 123 }`,
    create_branch: `Create a GitHub branch.
TYPE RULES:
- owner: string
- repo: string
- branch: string
- base: string (if required by tool)`,
  },

  slack: {
    list_channels: "List Slack channels visible to the bot token.",
    post_message: `Post a Slack message.
TYPE RULES:
- channel_id: string
- text: string`,
    slack_list_channels: "List Slack channels visible to the bot token.",
    slack_post_message: `Post a Slack message.
TYPE RULES:
- channel_id: string
- text: string`,
    post_thread_message: `Post a message in an existing Slack thread.
TYPE RULES:
- channel_id: string
- thread_ts: string
- text: string`,
    post_comment: `Alias for posting a message.
TYPE RULES:
- channel_id: string
- text: string
- thread_ts: string (if posting in a thread)`,
    post_comment_thread: `Alias for posting in a thread.
TYPE RULES:
- channel_id: string
- thread_ts: string
- text: string`,
  },

  linear: {
    list_projects: `List Linear projects and teams.
OUTPUT:
- Select a team_id or project_id explicitly.

TYPE RULES:
- limit: number (if supported)
- includeArchived: boolean (if supported)`,

    linear_search_issues: `Search Linear issues.
TYPE RULES:
- query: string
- limit: number
- priority: number

BAD:
{ "query": "oauth", "limit": "10", "priority": "2" }

GOOD:
{ "query": "oauth", "limit": 10, "priority": 2 }

RECOVERY:
- If tool returns ZodError invalid_type on limit/priority, retry with numbers.`,

    create_issue: `Create a Linear issue.
PREREQ:
- Requires a team identifier (and project if applicable).
- First call list_projects or list_teams if available.

TYPE RULES:
- team_id (or teamId): string (use the schema name)
- title: string
- description: string (optional)
- priority: number (only if the schema uses numeric priority)

BAD:
{ "priority": "1" }

GOOD:
{ "priority": 1 }`,
  },
};

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

export function convertMCPToolToAItTool(mcpTool: MCPTool, vendor: MCPVendor, manager: MCPClientManager): Tool {
  const parametersSchema = (
    mcpTool.inputSchema ? jsonSchemaToZod(mcpTool.inputSchema) : z.record(z.string(), z.string())
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
