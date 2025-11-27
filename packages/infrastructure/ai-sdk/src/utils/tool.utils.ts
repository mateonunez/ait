import type { Tool, ToolResult } from "../types/tools";

export function createTool<TParams, TResult>(config: Tool<TParams, TResult>): Tool<TParams, TResult> {
  return config;
}

export function createSuccessResult<T>(data: T): ToolResult<T> {
  return {
    success: true,
    data,
  };
}

export function createErrorResult<T = any>(error: string): ToolResult<T> {
  return {
    success: false,
    error,
  };
}
