import type { ReasoningType, TaskStatus } from "../constants/stream.constants";
import type { ReasoningStep } from "../types/metadata/reasoning-step.metadata";
import type { SuggestionAction, SuggestionItem, SuggestionType } from "../types/metadata/suggestion.metadata";
import type { TaskStep } from "../types/metadata/task-step.metadata";
import type { ToolCallMetadata } from "../types/metadata/tool-call.metadata";

// Tool Call Metadata Helpers
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

// Reasoning Step Metadata Helpers
export function createReasoningStep(content: string, type: ReasoningType = "analysis", order = 0): ReasoningStep {
  return {
    id: `reasoning-${Date.now()}-${order}`,
    type,
    content,
    timestamp: Date.now(),
    order,
  };
}

// Suggestion Metadata Helpers
export function createSuggestion(text: string, type: SuggestionType = "question", icon?: string): SuggestionItem {
  return {
    id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text,
    type,
    icon,
  };
}

export function createActionSuggestion(text: string, action: SuggestionAction, icon?: string): SuggestionItem {
  return {
    ...createSuggestion(text, "action", icon),
    action,
  };
}

// Task Step Metadata Helpers
export function createTaskStep(description: string, order = 0): TaskStep {
  const now = Date.now();
  return {
    id: `task-${now}-${order}`,
    description,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    order,
  };
}

export function updateTaskStatus(task: TaskStep, status: TaskStatus, result?: string, error?: string): TaskStep {
  return {
    ...task,
    status,
    result,
    error,
    updatedAt: Date.now(),
    progress: status === "completed" ? 100 : status === "in_progress" ? 50 : 0,
  };
}
