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
