export interface ToolCallMetadata {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: ToolCallStatus;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}

export type ToolCallStatus = "pending" | "executing" | "completed" | "failed";

export function createToolCallMetadata(name: string, args: Record<string, unknown>): ToolCallMetadata {
  return {
    id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    arguments: args,
    status: "pending",
    startedAt: Date.now(),
  };
}

export function completeToolCall(toolCall: ToolCallMetadata, result: unknown): ToolCallMetadata {
  const completedAt = Date.now();
  return {
    ...toolCall,
    result,
    status: "completed",
    completedAt,
    durationMs: completedAt - toolCall.startedAt,
  };
}

export function failToolCall(toolCall: ToolCallMetadata, error: string): ToolCallMetadata {
  const completedAt = Date.now();
  return {
    ...toolCall,
    error,
    status: "failed",
    completedAt,
    durationMs: completedAt - toolCall.startedAt,
  };
}
