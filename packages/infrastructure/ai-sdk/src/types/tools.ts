import type { z } from "zod";

export interface Tool<TParams = any, TResult = any> {
  description: string;
  parameters: z.ZodSchema<TParams>;
  execute: (params: TParams) => Promise<TResult>;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

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
