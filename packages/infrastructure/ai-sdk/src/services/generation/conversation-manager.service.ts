import type { ConversationConfig, ConversationContext } from "../../types/text-generation";
import type { ChatMessage } from "../../types/chat";
import { TokenEstimationService, type ITokenEstimationService } from "../metadata/token-estimation.service";
import { getAItClient, type AItClient } from "../../client/ai-sdk.client";
import { buildSummarizationPrompt } from "../prompts/summarization.prompt";

/**
 * Interface for conversation manager service
 */
export interface IConversationManagerService {
  /**
   * Process conversation history and apply context window constraints
   * @param messages - Full conversation history
   * @param currentPrompt - Current user prompt
   * @returns Conversation context with recent messages and optional summary
   */
  processConversation(messages: ChatMessage[] | undefined, currentPrompt: string): Promise<ConversationContext>;
}

/**
 * Service for managing conversation history and context windows
 */
export class ConversationManagerService implements IConversationManagerService {
  private readonly _maxRecentMessages: number;
  private readonly _maxHistoryTokens: number;
  private readonly _enableSummarization: boolean;
  private readonly _tokenEstimator: ITokenEstimationService;
  private readonly _client: AItClient;

  constructor(config: ConversationConfig = {}, tokenEstimator?: ITokenEstimationService, client?: AItClient) {
    this._maxRecentMessages = Math.max(config.maxRecentMessages ?? 10, 1);
    this._maxHistoryTokens = Math.max(config.maxHistoryTokens ?? 2000, 100);
    this._enableSummarization = config.enableSummarization ?? true;
    this._tokenEstimator = tokenEstimator || new TokenEstimationService();
    this._client = client || getAItClient();
  }

  async processConversation(messages: ChatMessage[] | undefined, currentPrompt: string): Promise<ConversationContext> {
    if (!messages || messages.length === 0) {
      return {
        recentMessages: [],
        estimatedTokens: this._tokenEstimator.estimateTokens(currentPrompt),
      };
    }

    // Split messages into recent and older
    const recentMessages = messages.slice(-this._maxRecentMessages);
    const olderMessages = messages.slice(0, -this._maxRecentMessages);

    const currentPromptTokens = this._tokenEstimator.estimateTokens(currentPrompt);
    const recentTokens = this._tokenEstimator.estimateTokensForMessages(recentMessages);

    // Case 1: No summarization enabled or no older messages
    if (!this._enableSummarization || olderMessages.length === 0) {
      const totalTokens = currentPromptTokens + recentTokens;

      if (totalTokens <= this._maxHistoryTokens) {
        return {
          recentMessages,
          estimatedTokens: totalTokens,
        };
      }

      // Truncate recent messages to fit
      const truncatedMessages = this._truncateMessages(recentMessages, this._maxHistoryTokens - currentPromptTokens);
      return {
        recentMessages: truncatedMessages,
        estimatedTokens: currentPromptTokens + this._tokenEstimator.estimateTokensForMessages(truncatedMessages),
      };
    }

    // Case 2: Summarization enabled AND we have older messages
    const summary = await this._summarizeMessages(olderMessages);
    const summaryTokens = this._tokenEstimator.estimateTokens(summary);

    // Check if everything fits (Summary + Recent + Prompt)
    const totalTokensWithSummary = currentPromptTokens + summaryTokens + recentTokens;

    if (totalTokensWithSummary <= this._maxHistoryTokens) {
      return {
        recentMessages,
        summary,
        estimatedTokens: totalTokensWithSummary,
      };
    }

    // If not, truncate recent messages to fit remaining space
    const remainingTokens = this._maxHistoryTokens - currentPromptTokens - summaryTokens;

    // If remaining space is too small (e.g. < 0), we might need to drop summary or handle differently
    // For now, we prioritize summary and truncate recent as much as needed
    const truncatedRecentMessages = this._truncateMessages(recentMessages, Math.max(0, remainingTokens));

    return {
      recentMessages: truncatedRecentMessages,
      summary,
      estimatedTokens:
        currentPromptTokens + summaryTokens + this._tokenEstimator.estimateTokensForMessages(truncatedRecentMessages),
    };
  }

  private _truncateMessages(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    const truncated: ChatMessage[] = [];
    let currentTokens = 0;

    // Take messages from the end (most recent) until we hit the token limit
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]!;
      const msgTokens = this._tokenEstimator.estimateTokens(`${msg.role}: ${msg.content}`);

      if (currentTokens + msgTokens <= maxTokens) {
        truncated.unshift(msg);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    return truncated;
  }

  private async _summarizeMessages(messages: ChatMessage[], currentSummary?: string): Promise<string> {
    if (messages.length === 0) {
      return currentSummary || "";
    }

    try {
      const prompt = buildSummarizationPrompt(messages, currentSummary);

      const response = await this._client.generateText({
        prompt,
        temperature: 0.3, // Low temperature for factual summarization
      });

      return response.text.trim();
    } catch (error) {
      console.warn("Failed to summarize conversation with LLM, falling back to simple concatenation", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback: Extract key topics from messages for a more meaningful summary
      const topics = this._extractTopicsFromMessages(messages);
      const topicSummary = topics.length > 0 ? `Topics discussed: ${topics.join(", ")}` : "";

      const messageSummary = `${messages.length} messages processed`;
      const fallbackText = topicSummary ? `${topicSummary}. ${messageSummary}` : messageSummary;

      return currentSummary
        ? `${currentSummary}\n\n[Additional history]: ${fallbackText}.`
        : `[History summary]: ${fallbackText}.`;
    }
  }

  private _extractTopicsFromMessages(messages: ChatMessage[]): string[] {
    const topics = new Set<string>();
    const commonWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "should",
      "could",
      "may",
      "might",
      "can",
      "about",
      "this",
      "that",
      "these",
      "those",
      "i",
      "you",
      "he",
      "she",
      "it",
      "we",
      "they",
      "me",
      "him",
      "her",
      "us",
      "them",
      "my",
      "your",
      "his",
      "its",
      "our",
      "their",
      "what",
      "which",
      "who",
      "when",
      "where",
      "why",
      "how",
      "all",
      "each",
      "every",
      "both",
      "few",
      "more",
      "most",
      "other",
      "some",
      "such",
      "tell",
      "asked",
      "ask",
      "please",
      "thanks",
      "thank",
      "hello",
      "hi",
      "hey",
    ]);

    for (const message of messages) {
      const words = message.content
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !commonWords.has(word) && !/^\d+$/.test(word));

      for (const word of words.slice(0, 3)) {
        topics.add(word);
      }
    }

    return Array.from(topics).slice(0, 5);
  }
}
