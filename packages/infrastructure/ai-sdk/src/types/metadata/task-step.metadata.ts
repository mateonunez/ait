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
