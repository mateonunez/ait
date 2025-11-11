export interface SuggestionItem {
  id: string;
  text: string;
  type: SuggestionType;
  icon?: string;
  action?: SuggestionAction;
  score?: number;
}

export type SuggestionType = "question" | "action" | "tool" | "related";

export interface SuggestionAction {
  type: "prompt" | "tool_call" | "navigation";
  payload: string | Record<string, unknown>;
}

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
