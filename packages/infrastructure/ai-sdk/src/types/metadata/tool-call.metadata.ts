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
