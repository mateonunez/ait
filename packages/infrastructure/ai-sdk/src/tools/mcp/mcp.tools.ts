import { z } from "zod";
import type { MCPClientManager, MCPTool, MCPToolResult, MCPVendor } from "../../mcp";
import type { Tool, ToolResult } from "../../types/tools";
import { jsonSchemaToZod } from "../../utils/mcp.schema.utils";
import { createTool } from "../../utils/tool.utils";

/**
 * Workflow hints for tools that require prerequisite information.
 * These help the LLM understand multi-step workflows AND correct parameter formats.
 */
const TOOL_WORKFLOW_HINTS: Record<string, Record<string, string>> = {
  notion: {
    "API-post-search": `Search for a page by title. Query must not be empty.
    IMPORTANT: If you are looking for a parent page to create a NEW page under, use the 'id' from the search result as the 'parent.page_id' in API-post-page.`,
    "API-post-page": `Create a new Notion page. First use API-post-search to find a parent page ID.

FORMAT (with content):
{
  "parent": { "page_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
  "properties": {
    "title": [{ "text": { "content": "Page Title" } }]
  },
  "children": [
    { "paragraph": { "rich_text": [{ "text": { "content": "First paragraph of content here." } }] } },
    { "heading_2": { "rich_text": [{ "text": { "content": "Section Title" } }] } },
    { "bulleted_list_item": { "rich_text": [{ "text": { "content": "Bullet point item" } }] } },
    {
      "table": {
        "table_width": 2,
        "has_column_header": true,
        "children": [
          { "table_row": { "cells": [[{ "text": { "content": "Header 1" } }], [{ "text": { "content": "Header 2" } }]] } },
          { "table_row": { "cells": [[{ "text": { "content": "Row 1 Col 1" } }], [{ "text": { "content": "Row 1 Col 2" } }]] } }
        ]
      }
    }
  ]
}

RULES:
- Do NOT include "type" field in rich_text items
- Use RAG context to populate children with relevant content
- Available block types: paragraph, heading_1, heading_2, heading_3, bulleted_list_item, numbered_list_item, to_do, quote, code`,
    "API-patch-page": "IMPORTANT: Requires page_id. First use API-post-search to find the page.",
    "API-post-comment": `Add a comment to a Notion page. First use API-post-search to find the page.
FORMAT:
{
  "parent": { "page_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
  "rich_text": [{ "text": { "content": "Your comment" } }]
}`,
    "API-post-database": "IMPORTANT: Requires parent.page_id. First use API-post-search to find a parent page.",
  },
  github: {
    create_issue: "IMPORTANT: Requires owner and repo. First use list_repos to find available repositories.",
    create_pull_request: "IMPORTANT: Requires owner and repo. First use list_repos to find the repository.",
    create_issue_comment: "IMPORTANT: Requires owner, repo, and issue_number. First find the issue.",
    create_branch: "IMPORTANT: Requires owner and repo. First use list_repos to find the repository.",
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
