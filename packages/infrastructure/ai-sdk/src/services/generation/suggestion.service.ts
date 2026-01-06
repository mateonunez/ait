import { getLogger } from "@ait/core";
import { generateText } from "ai";
import { createModel } from "../../client/ai-sdk.client";
import { GenerationModels } from "../../config/models.config";
import type { ChatMessage } from "../../types/chat";
import { buildSuggestionPrompt } from "../prompts/suggestion.prompt";

const logger = getLogger();

// Configuration constants
const MAX_SUGGESTIONS = 4;
const MAX_SUGGESTION_LENGTH = 60;
const RECENT_MESSAGES_LIMIT = 4;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MODEL = GenerationModels.GEMMA_3;

export interface SuggestionContext {
  context?: string;
  history?: string;
  recentMessages?: ChatMessage[];
}

export interface SuggestionOptions {
  model?: string;
  temperature?: number;
  maxSuggestions?: number;
  correlationId?: string;
}

export interface Suggestion {
  id: string;
  type: "question" | "action";
  text: string;
}

export interface ISuggestionService {
  generateSuggestions(context: SuggestionContext, options?: SuggestionOptions): Promise<Suggestion[]>;
}

const FALLBACK_SUGGESTIONS: Suggestion[] = [
  { id: "fallback-1", type: "question", text: "What can you help me with?" },
  { id: "fallback-2", type: "question", text: "Show my recent GitHub activity" },
  { id: "fallback-3", type: "question", text: "What's on my calendar today?" },
];

export class SuggestionService implements ISuggestionService {
  async generateSuggestions(context: SuggestionContext, options: SuggestionOptions = {}): Promise<Suggestion[]> {
    const modelName = options.model || DEFAULT_MODEL;
    const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
    const maxSuggestions = options.maxSuggestions ?? MAX_SUGGESTIONS;
    const correlationId = options.correlationId;

    logger.debug("[SuggestionService] Generating suggestions", {
      modelName,
      temperature,
      maxSuggestions,
      correlationId,
      hasContext: !!context.context,
      hasHistory: !!context.history,
      recentMessagesCount: context.recentMessages?.length ?? 0,
    });

    try {
      const model = createModel(modelName);
      const recentMessages = context.recentMessages?.slice(-RECENT_MESSAGES_LIMIT);
      const prompt = buildSuggestionPrompt(context.context, context.history, recentMessages);

      const { text } = await generateText({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
      });

      const suggestionsList = this._parseResponse(text.trim());
      const validSuggestions = this._filterValidSuggestions(suggestionsList);

      logger.debug("[SuggestionService] Suggestions generated", {
        correlationId,
        rawCount: suggestionsList.length,
        validCount: validSuggestions.length,
      });

      return validSuggestions.slice(0, maxSuggestions).map((text, index) => ({
        id: `suggestion-${Date.now()}-${index}`,
        type: "question",
        text,
      }));
    } catch (error) {
      logger.error("[SuggestionService] Failed to generate suggestions", { error, correlationId });
      return FALLBACK_SUGGESTIONS;
    }
  }

  private _parseResponse(text: string): string[] {
    // Try JSON array first
    const parsed = this._parseJsonArray(text);
    if (parsed) {
      return parsed;
    }

    // Fallback to line-based parsing
    logger.debug("[SuggestionService] JSON parse failed, using line-based fallback");
    return text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) =>
        line
          .replace(/^\d+\.\s*/, "")
          .replace(/^[-•]\s*/, "")
          .replace(/^["']|["']$/g, ""),
      );
  }

  private _parseJsonArray(text: string): string[] | null {
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private _filterValidSuggestions(suggestions: string[]): string[] {
    return suggestions.map((s) => s.trim()).filter((s) => s.length > 0 && s.length < MAX_SUGGESTION_LENGTH);
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
