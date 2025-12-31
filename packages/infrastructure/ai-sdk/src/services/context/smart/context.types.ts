import type { Document } from "../../../types/documents";

export enum ContextTier {
  IMMUTABLE = 0,
  ACTIVE_TASK = 1,
  WORKING_SET = 2,
  CONDENSED_HISTORY = 3,
  LONG_TERM_MEMORY = 4,
}

export interface ContextItem {
  id: string;
  tier: ContextTier;
  content: string;
  type: "slack_message" | "document" | "summary" | "tool_result" | "system";
  tokens: number;
  metadata?: Record<string, unknown>;
  sourceId?: string;
  timestamp: number;
  priority?: number;
  score?: number;
}

export interface ContextBudget {
  totalTokenLimit: number;
  ragTokenLimit?: number;
  reservedTokens: {
    [key in ContextTier]?: number;
  };
  tierLimits: {
    [key in ContextTier]?: number;
  };
}

export interface ContextState {
  items: ContextItem[];
  budget: ContextBudget;
  summary?: string;
}

export interface IContextManager {
  assembleContext(request: {
    systemInstructions: string;
    messages: unknown[];
    retrievedDocs?: Document[];
  }): Promise<string>;
}
