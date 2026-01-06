import { getLogger } from "@ait/core";
import { safeJsonSize } from "@ait/core";
import type { MCPVendor } from "../../mcp";
import type { ToolMetadata } from "./tool-metadata.store";

const logger = getLogger();

export type ToolExecutionContext = {
  vendor: MCPVendor;
  toolName: string;
  metadata?: ToolMetadata;
};
export type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown>;
export type ToolMiddleware = (ctx: ToolExecutionContext, next: ToolExecutor) => ToolExecutor;

export function composeMiddlewares(
  middlewares: ToolMiddleware[],
  base: ToolExecutor,
  ctx: ToolExecutionContext,
): ToolExecutor {
  return middlewares.reduceRight((next, mw) => mw(ctx, next), base);
}

export function telemetryMiddleware(): ToolMiddleware {
  return (ctx, next) => async (args) => {
    const start = Date.now();
    try {
      const result = await next(args);
      logger.debug("[MCPTool] executed", {
        vendor: ctx.vendor,
        toolName: ctx.toolName,
        durationMs: Date.now() - start,
        resultJsonSize: safeJsonSize(result),
      });
      return result;
    } catch (error: unknown) {
      logger.error("[MCPTool] failed", {
        vendor: ctx.vendor,
        toolName: ctx.toolName,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}
