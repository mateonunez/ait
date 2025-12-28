import { getLogger } from "@ait/core";
import { z } from "zod";
import type { MCPClientManager, MCPTool, MCPToolResult, MCPVendor } from "../mcp";
import { getToolMetadata, validateMetadataAgainstDiscoveredTools } from "../tools/registry/tool-metadata.store";
import { type ToolMiddleware, composeMiddlewares, telemetryMiddleware } from "../tools/registry/tool-middleware";
import type { Tool, ToolResult } from "../types/tools";
import { jsonSchemaToZod } from "../utils/mcp.schema.utils";
import { createTool } from "../utils/tool.utils";

const logger = getLogger();

function convertMcpResultToToolResult(mcpResult: MCPToolResult): ToolResult {
  if (!mcpResult.success) {
    return { success: false, error: mcpResult.error || "Unknown error" };
  }

  const textContent = mcpResult.content
    ?.filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("\n");

  return { success: true, data: textContent || mcpResult.content };
}

function cleanToolParams(obj: any): any {
  if (obj === null || obj === "") return undefined;
  if (Array.isArray(obj)) return obj.map(cleanToolParams).filter((val) => val !== undefined);
  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanValue = cleanToolParams(value);
      if (cleanValue !== undefined) result[key] = cleanValue;
    }
    return result;
  }
  return obj;
}

function buildDescription(vendor: MCPVendor, tool: MCPTool): string {
  const meta = getToolMetadata(vendor, tool.name);
  const parts: string[] = [];
  if (tool.description) parts.push(tool.description);
  if (meta?.preconditions?.length) parts.push(`PRECONDITIONS:\n- ${meta.preconditions.join("\n- ")}`);
  if (meta?.guidance?.length) parts.push(`GUIDANCE:\n- ${meta.guidance.join("\n- ")}`);
  if (meta?.examples?.length) {
    parts.push(
      `EXAMPLES:\n${meta.examples
        .slice(0, 2)
        .map((e) => `- ${e.title}: ${JSON.stringify(e.input)}`)
        .join("\n")}`,
    );
  }
  return parts.length ? parts.join("\n\n") : `Execute ${tool.name} on ${vendor}`;
}

export type McpToolRegistryOptions = {
  manager: MCPClientManager;
  middlewares?: ToolMiddleware[];
};

export class McpToolRegistry {
  private readonly _manager: MCPClientManager;
  private readonly _middlewares: ToolMiddleware[];

  constructor(options: McpToolRegistryOptions) {
    this._manager = options.manager;
    this._middlewares = options.middlewares ?? [telemetryMiddleware()];
  }

  async getToolsForConnectedVendors(): Promise<Record<string, Tool>> {
    const vendors = this._manager.getConnectedVendors();
    const discoveredToolsByVendor: Record<MCPVendor, string[]> = {} as any;
    const all: Record<string, Tool> = {};

    for (const vendor of vendors) {
      const mcpTools = await this._manager.listTools(vendor);
      discoveredToolsByVendor[vendor] = mcpTools.map((t) => t.name);

      for (const mcpTool of mcpTools) {
        const name = `${vendor}_${mcpTool.name}`;
        all[name] = this._convertTool(vendor, mcpTool);
      }
    }

    const validation = validateMetadataAgainstDiscoveredTools({ discoveredToolsByVendor });
    if (validation.unknownMetadataKeys.length > 0) {
      logger.warn("[McpToolRegistry] metadata references unknown tools", {
        unknownMetadataKeys: validation.unknownMetadataKeys.slice(0, 20),
      });
    }
    if (validation.missingMetadata.length > 0) {
      logger.warn("[McpToolRegistry] missing metadata for required tools", {
        missing: validation.missingMetadata,
      });
    }

    return all;
  }

  private _convertTool(vendor: MCPVendor, mcpTool: MCPTool): Tool {
    const parametersSchema = (
      mcpTool.inputSchema ? jsonSchemaToZod(mcpTool.inputSchema) : z.record(z.string(), z.any())
    ) as z.ZodSchema<any>;
    const metadata = getToolMetadata(vendor, mcpTool.name);

    const baseExecutor = async (args: Record<string, unknown>) => {
      const cleanParams = cleanToolParams(args);
      const result = await this._manager.executeTool(vendor, mcpTool.name, cleanParams);
      return convertMcpResultToToolResult(result);
    };

    const executor = composeMiddlewares(this._middlewares, baseExecutor, { vendor, toolName: mcpTool.name, metadata });

    return createTool({
      description: buildDescription(vendor, mcpTool),
      parameters: parametersSchema,
      execute: executor as any,
    });
  }
}
