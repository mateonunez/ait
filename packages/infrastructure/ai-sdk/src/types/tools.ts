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

export interface SpotifySearchResult {
  type: string;
  name?: string;
  artist?: string;
  description?: string;
  content: string;
}

export interface GitHubSearchResult {
  type: string;
  name?: string;
  description?: string;
  language?: string;
  topics?: string[];
  stars?: number;
  forks?: number;
  content: string;
}

export interface TwitterSearchResult {
  type: string;
  text: string;
  mentions?: string[];
  hashtags?: string[];
  created_at?: string;
  likes?: number;
  retweets?: number;
}

export interface LinearSearchResult {
  type: string;
  title?: string;
  description: string;
  state?: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
}

export interface SearchResponse<T> {
  results: T[];
  count: number;
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
