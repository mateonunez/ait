import { AItError, getLogger } from "@ait/core";
import { safeJsonSize } from "@ait/core";
import { tool } from "ai";
import type { Tool as AiInternalTool } from "../types/tools";

const logger = getLogger();

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
          execute: t.execute
            ? async (args: any) => {
                const start = Date.now();
                logger.debug(`Executing tool: ${name}`);
                const result = await t.execute!(args);
                logger.debug(`Tool completed: ${name}`, {
                  durationMs: Date.now() - start,
                  resultType: result === null ? "null" : Array.isArray(result) ? "array" : typeof result,
                  resultJsonSize: safeJsonSize(result),
                });
                return result;
              }
            : undefined,
        } as any),
      ];
    }),
  );
}
