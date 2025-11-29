import { getAItClient, type AItClient } from "../../client/ai-sdk.client";
import { buildSuggestionPrompt } from "../prompts/suggestion.prompt";
import { getLogger } from "@ait/core";

const logger = getLogger();

export interface SuggestionContext {
  context?: string;
  history?: string;
}

export interface Suggestion {
  id: string;
  type: "question" | "action";
  text: string;
}

export class SuggestionService {
  private readonly _client: AItClient;

  constructor(client?: AItClient) {
    this._client = client || getAItClient();
  }

  async generateSuggestions(context: SuggestionContext): Promise<Suggestion[]> {
    try {
      const prompt = buildSuggestionPrompt(context.context, context.history);

      const response = await this._client.generateText({
        prompt,
        temperature: 0.7, // Slightly higher temperature for creativity
      });

      const text = response.text.trim();

      let suggestionsList: string[] = [];
      try {
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
          suggestionsList = JSON.parse(jsonMatch[0]);
        } else {
          suggestionsList = text
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line) => line.replace(/^\d+\.\s*/, "").replace(/^- \s*/, ""));
        }
      } catch (e) {
        logger.warn("Failed to parse suggestions JSON, falling back to raw text split", { error: e });
        suggestionsList = text.split("\n").filter((line) => line.trim().length > 0);
      }

      return suggestionsList.slice(0, 4).map((text, index) => ({
        id: `suggestion-${Date.now()}-${index}`,
        type: "question",
        text: text.trim(),
      }));
    } catch (error) {
      logger.error("Failed to generate suggestions:", { error });
      return [
        { id: "fallback-1", type: "question", text: "What can you do?" },
        { id: "fallback-2", type: "question", text: "Show me my recent activity" },
        { id: "fallback-3", type: "question", text: "Help me with my code" },
      ];
    }
  }
}

/**
 * Singleton instance of the SuggestionService
 */
let _suggestionService: SuggestionService | null = null;

export function getSuggestionService(): SuggestionService {
  if (!_suggestionService) {
    _suggestionService = new SuggestionService();
  }
  return _suggestionService;
}
