import { AItError } from "@ait/core";
import { tool } from "ai";
import type { Tool as AiInternalTool } from "../types/tools";

export function convertToCoreTools(tools: Record<string, AiInternalTool>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, t]) => {
      const schema = (t as any).inputSchema || (t as any).parameters;

      if (!schema) {
        throw new AItError("TOOL_CONVERSION", `Tool "${name}" missing inputSchema or parameters`);
      }

      return [
        name,
        tool({
          description: t.description,
          parameters: schema,
          execute: t.execute ? async (args: any) => t.execute!(args) : undefined,
        } as any),
      ];
    }),
  );
}
