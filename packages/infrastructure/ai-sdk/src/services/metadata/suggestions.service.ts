import { createSuggestion, createActionSuggestion } from "../../utils/metadata.utils";
import type { SuggestionItem, ChatMessage } from "../../types";

/**
 * Service for generating contextual follow-up suggestions
 */

export interface ISuggestionsService {
  generateSuggestions(query: string, response: string, context?: ChatMessage[]): SuggestionItem[];
}

export class SuggestionsService implements ISuggestionsService {
  private readonly topicPatterns: Map<RegExp, SuggestionItem[]> = new Map([
    // Code-related
    [
      /(?:code|function|class|component|implement)/i,
      [
        createSuggestion("Explain how this code works", "question", "code"),
        createSuggestion("Show me similar examples", "related", "search"),
        createSuggestion("What are the best practices?", "question", "lightbulb"),
      ],
    ],
    // Music/Spotify
    [
      /(?:song|music|play|spotify|artist|album)/i,
      [
        createActionSuggestion(
          "Play similar songs",
          { type: "tool_call", payload: { tool: "spotify", action: "recommendations" } },
          "music",
        ),
        createSuggestion("Show me more from this artist", "action", "user"),
        createSuggestion("Create a playlist", "action", "list"),
      ],
    ],
    // GitHub/Development
    [
      /(?:github|repository|issue|pull request|commit)/i,
      [
        createSuggestion("Show related issues", "related", "github"),
        createSuggestion("View repository activity", "action", "activity"),
        createSuggestion("Check recent commits", "action", "git-commit"),
      ],
    ],
    // Linear/Project Management
    [
      /(?:linear|issue|ticket|project|task)/i,
      [
        createSuggestion("Show related issues", "related", "link"),
        createSuggestion("Create a new issue", "action", "plus-circle"),
        createSuggestion("View project timeline", "action", "calendar"),
      ],
    ],
    // General questions
    [
      /(?:what|how|why|when|where)/i,
      [
        createSuggestion("Tell me more details", "question", "info"),
        createSuggestion("Show me an example", "question", "file-text"),
        createSuggestion("Compare alternatives", "question", "git-compare"),
      ],
    ],
  ]);

  /**
   * Generate contextual suggestions based on query and response
   */
  generateSuggestions(query: string, response: string, context?: ChatMessage[]): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];

    // Add topic-specific suggestions
    for (const [pattern, topicSuggestions] of this.topicPatterns) {
      if (pattern.test(query) || pattern.test(response)) {
        suggestions.push(...topicSuggestions);
        break; // Only add one topic's suggestions
      }
    }

    // Add context-aware suggestions
    if (context && context.length > 0) {
      suggestions.push(createSuggestion("Continue this conversation", "related", "message-circle"));
    }

    // Add response-based suggestions
    if (response.includes("error") || response.includes("failed")) {
      suggestions.push(createSuggestion("How can I fix this?", "question", "wrench"));
    }

    if (response.includes("```")) {
      suggestions.push(createSuggestion("Explain this code", "question", "code"));
    }

    // Generic fallback suggestions
    if (suggestions.length === 0) {
      suggestions.push(
        createSuggestion("Ask a follow-up question", "question", "message-square"),
        createSuggestion("Explore related topics", "related", "compass"),
        createSuggestion("Get more details", "question", "zoom-in"),
      );
    }

    // Limit to 5 suggestions and add scores
    return suggestions.slice(0, 5).map((suggestion, index) => ({
      ...suggestion,
      score: 1 - index * 0.1, // Decreasing relevance score
    }));
  }

  /**
   * Generate suggestions from tool results
   */
  generateToolSuggestions(toolName: string, toolResult: unknown): SuggestionItem[] {
    const suggestions: SuggestionItem[] = [];

    switch (toolName) {
      case "spotify_search":
      case "spotify_get_current_track":
        suggestions.push(
          createActionSuggestion("Play similar tracks", { type: "tool_call", payload: { tool: "spotify" } }, "music"),
          createSuggestion("Show track details", "action", "info"),
        );
        break;

      case "github_search":
      case "github_get_issue":
        suggestions.push(
          createSuggestion("View repository", "action", "github"),
          createSuggestion("Show related issues", "related", "link"),
        );
        break;

      case "linear_search":
      case "linear_get_issue":
        suggestions.push(
          createSuggestion("View issue details", "action", "external-link"),
          createSuggestion("Show project board", "action", "trello"),
        );
        break;

      default:
        suggestions.push(createSuggestion("Use this result", "action", "check"));
    }

    return suggestions;
  }
}

// Singleton instance
let suggestionsService: ISuggestionsService | null = null;

export function getSuggestionsService(): ISuggestionsService {
  if (!suggestionsService) {
    suggestionsService = new SuggestionsService();
  }
  return suggestionsService;
}
