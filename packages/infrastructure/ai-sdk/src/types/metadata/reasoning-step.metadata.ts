import type { ReasoningType } from "../../constants/stream.constants";

export interface ReasoningStep {
  id: string;
  type: ReasoningType;
  content: string;
  confidence?: number;
  timestamp: number;
  order: number;
  dependencies?: string[];
}

export function createReasoningStep(content: string, type: ReasoningType = "analysis", order = 0): ReasoningStep {
  return {
    id: `reasoning-${Date.now()}-${order}`,
    type,
    content,
    timestamp: Date.now(),
    order,
  };
}
