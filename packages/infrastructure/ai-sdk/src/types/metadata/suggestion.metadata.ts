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
