import type { Suggestion } from "@ait/ai-sdk";
import { requestJson } from "@ait/core";
import { apiConfig } from "../config/api.config";

export interface FetchSuggestionsOptions {
  context?: string;
  history?: string;
}

export async function fetchSuggestions(options: FetchSuggestionsOptions): Promise<Suggestion[]> {
  const result = await requestJson<Suggestion[]>(`${apiConfig.apiBaseUrl}/suggestions`, {
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
