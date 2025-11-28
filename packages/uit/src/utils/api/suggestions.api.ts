import { requestJson } from "@ait/core";
import type { Suggestion } from "@ait/ai-sdk";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:3000/api";

export interface FetchSuggestionsOptions {
  context?: string;
  history?: string;
}

export async function fetchSuggestions(options: FetchSuggestionsOptions): Promise<Suggestion[]> {
  const result = await requestJson<Suggestion[]>(`${API_BASE_URL}/suggestions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  if (!result.ok) {
    throw new Error(`Failed to fetch suggestions: ${result.error.message}`);
  }

  return result.value.data;
}
