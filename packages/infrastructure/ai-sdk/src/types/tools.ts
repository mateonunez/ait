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
