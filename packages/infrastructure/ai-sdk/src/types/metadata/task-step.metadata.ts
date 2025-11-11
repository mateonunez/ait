import type { TaskStatus } from "../../constants/stream.constants";

export interface TaskStep {
  id: string;
  description: string;
  status: TaskStatus;
  result?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  order: number;
  parentId?: string;
  progress?: number;
}

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
