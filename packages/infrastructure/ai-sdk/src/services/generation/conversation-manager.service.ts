import type { ConversationConfig, ConversationContext } from "../../types/text-generation";
import type { ChatMessage } from "../../types/chat";
import { TokenEstimationService, type ITokenEstimationService } from "../metadata/token-estimation.service";

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

  constructor(config: ConversationConfig = {}, tokenEstimator?: ITokenEstimationService) {
    this._maxRecentMessages = Math.max(config.maxRecentMessages ?? 10, 1);
    this._maxHistoryTokens = Math.max(config.maxHistoryTokens ?? 2000, 100);
    this._enableSummarization = config.enableSummarization ?? true;
    this._tokenEstimator = tokenEstimator || new TokenEstimationService();
  }

  async processConversation(messages: ChatMessage[] | undefined, currentPrompt: string): Promise<ConversationContext> {
    if (!messages || messages.length === 0) {
      return {
        recentMessages: [],
        estimatedTokens: this._tokenEstimator.estimateTokens(currentPrompt),
      };
    }

    // Calculate tokens for current prompt
    const currentPromptTokens = this._tokenEstimator.estimateTokens(currentPrompt);

    // Take recent messages (not exceeding maxRecentMessages)
    const recentMessages = messages.slice(-this._maxRecentMessages);
    const recentTokens = this._tokenEstimator.estimateTokensForMessages(recentMessages);

    // Check if we need summarization
    const totalRecentTokens = currentPromptTokens + recentTokens;

    if (totalRecentTokens <= this._maxHistoryTokens) {
      // Everything fits, no summarization needed
      return {
        recentMessages,
        estimatedTokens: totalRecentTokens,
      };
    }

    // Need to reduce recent messages or apply summarization
    if (!this._enableSummarization) {
      // Just truncate recent messages
      const truncatedMessages = this._truncateMessages(recentMessages, this._maxHistoryTokens - currentPromptTokens);
      return {
        recentMessages: truncatedMessages,
        estimatedTokens: currentPromptTokens + this._tokenEstimator.estimateTokensForMessages(truncatedMessages),
      };
    }

    // Apply summarization strategy
    const olderMessages = messages.slice(0, -this._maxRecentMessages);

    if (olderMessages.length === 0) {
      // No older messages to summarize, just truncate recent
      const truncatedMessages = this._truncateMessages(recentMessages, this._maxHistoryTokens - currentPromptTokens);
      return {
        recentMessages: truncatedMessages,
        estimatedTokens: currentPromptTokens + this._tokenEstimator.estimateTokensForMessages(truncatedMessages),
      };
    }

    // Create summary of older messages
    const summary = this._summarizeMessages(olderMessages);
    const summaryTokens = this._tokenEstimator.estimateTokens(summary);

    // Calculate remaining space for recent messages
    const remainingTokens = this._maxHistoryTokens - currentPromptTokens - summaryTokens;
    const truncatedRecentMessages = this._truncateMessages(recentMessages, remainingTokens);

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

  private _summarizeMessages(messages: ChatMessage[]): string {
    if (messages.length === 0) {
      return "";
    }

    // Extract key topics and information
    const userMessages = messages.filter((m) => m.role === "user");
    const assistantMessages = messages.filter((m) => m.role === "assistant");

    const topics = new Set<string>();

    // Extract potential topics from user messages (simple keyword extraction)
    for (const msg of userMessages) {
      const words = msg.content.toLowerCase().split(/\s+/);
      // Look for important words (longer than 4 chars, not common words)
      const commonWords = new Set(["what", "when", "where", "which", "this", "that", "these", "those", "with"]);
      for (const word of words) {
        if (word.length > 4 && !commonWords.has(word)) {
          topics.add(word);
        }
      }
    }

    const summaryParts: string[] = ["[Previous conversation summary]"];

    if (userMessages.length > 0) {
      summaryParts.push(`User asked about: ${Array.from(topics).slice(0, 5).join(", ")}`);
    }

    if (assistantMessages.length > 0) {
      summaryParts.push(`Assistant provided ${assistantMessages.length} response(s)`);
    }

    summaryParts.push(`[End of summary - ${messages.length} messages]`);

    return summaryParts.join(". ");
  }
}
