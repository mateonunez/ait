import type { Document } from "../../../types/documents";

export enum ContextTier {
  /**
   * Tier 0: Immutable
   * System instructions, safety rules, developer constraints.
   * NEVER dropped.
   */
  IMMUTABLE = 0,

  /**
   * Tier 1: Active Task State
   * Current goal, plan, user preferences, immediate context.
   * High priority, rarely dropped.
   */
  ACTIVE_TASK = 1,

  /**
   * Tier 2: Working Set
   * Recent conversation turns, tool outputs, active documents.
   * Dropped or summarized when budget is tight.
   */
  WORKING_SET = 2,

  /**
   * Tier 3: Condensed History
   * Rolling summaries, key decisions, "facts" from past turns.
   * Compressed representation of Tier 2.
   */
  CONDENSED_HISTORY = 3,

  /**
   * Tier 4: Long-term Memory / RAG
   * Retrieved documents only relevant to current query.
   * Lowest priority for "always on" context, but high priority for specific queries.
   */
  LONG_TERM_MEMORY = 4,
}

export interface ContextItem {
  id: string;
  tier: ContextTier;
  content: string;
  type: "message" | "document" | "summary" | "tool_result" | "system";
  tokens: number;
  metadata?: Record<string, unknown>;
  /**
   * Original source of this item (e.g. message ID, file path)
   */
  sourceId?: string;
  timestamp: number;
  priority?: number; // Higher is better within same tier
}

export interface ContextBudget {
  totalTokenLimit: number;
  reservedTokens: {
    [key in ContextTier]?: number;
  };
  tierLimits: {
    [key in ContextTier]?: number; // Soft limit
  };
}

export interface ContextState {
  items: ContextItem[];
  budget: ContextBudget;
  summary?: string; // Global or rolling summary
}

export interface IContextManager {
  assembleContext(request: {
    systemInstructions: string;
    messages: unknown[]; // Type to be refined based on existing types
    retrievedDocs?: Document[];
  }): Promise<string>;
}
