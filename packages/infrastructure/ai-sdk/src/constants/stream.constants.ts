export const STREAM_EVENT = {
  TEXT: "0",
  METADATA: "m",
  DATA: "d",
  ERROR: "3",
} as const;

export type StreamEventType = (typeof STREAM_EVENT)[keyof typeof STREAM_EVENT];

export const METADATA_TYPE = {
  CONTEXT: "context",
  REASONING: "reasoning",
  TASK: "task",
  SUGGESTION: "suggestion",
  TOOL_CALL: "tool_call",
  MODEL: "model",
} as const;

export type MetadataType = (typeof METADATA_TYPE)[keyof typeof METADATA_TYPE];

export const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const REASONING_TYPE = {
  ANALYSIS: "analysis",
  PLANNING: "planning",
  EXECUTION: "execution",
  REFLECTION: "reflection",
} as const;

export type ReasoningType = (typeof REASONING_TYPE)[keyof typeof REASONING_TYPE];
