import { getLogger } from "@ait/core";
import { generate } from "../../generation/text";
import type { ChatMessage } from "../../types/chat";
import { buildSuggestionPrompt } from "../prompts/suggestion.prompt";

const logger = getLogger();

export interface SuggestionContext {
  context?: string;
  history?: string;
  recentMessages?: ChatMessage[];
}

export interface Suggestion {
  id: string;
  type: "question" | "action";
  text: string;
}

export class SuggestionService {
  async generateSuggestions(context: SuggestionContext): Promise<Suggestion[]> {
    try {
      const recentMessages = context.recentMessages?.slice(-4);

      const prompt = buildSuggestionPrompt(context.context, context.history, recentMessages);

      const response = await generate({
        prompt,
        temperature: 0.7,
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
            .map((line) =>
              line
                .replace(/^\d+\.\s*/, "")
                .replace(/^[-•]\s*/, "")
                .replace(/^["']|["']$/g, ""),
            );
        }
      } catch (e) {
        logger.warn("Failed to parse suggestions JSON, falling back to raw text split", { error: e });
        suggestionsList = text.split("\n").filter((line) => line.trim().length > 0);
      }

      const validSuggestions = suggestionsList.map((s) => s.trim()).filter((s) => s.length > 0 && s.length < 60);

      return validSuggestions.slice(0, 4).map((text, index) => ({
        id: `suggestion-${Date.now()}-${index}`,
        type: "question",
        text,
      }));
    } catch (error) {
      logger.error("Failed to generate suggestions:", { error });
      return [
        { id: "fallback-1", type: "question", text: "What can you help me with?" },
        { id: "fallback-2", type: "question", text: "Show my recent GitHub activity" },
        { id: "fallback-3", type: "question", text: "What's on my calendar today?" },
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
