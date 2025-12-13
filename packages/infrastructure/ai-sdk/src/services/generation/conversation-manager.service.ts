import { getLogger } from "@ait/core";
import { type AItClient, getAItClient } from "../../client/ai-sdk.client";
import type { ChatMessage } from "../../types/chat";
import type { ConversationConfig, ConversationContext } from "../../types/text-generation";
import { buildSummarizationPrompt } from "../prompts/summarization.prompt";
import { type TokenizerService, getTokenizer } from "../tokenizer/tokenizer.service";

const logger = getLogger();

export interface IConversationManagerService {
  processConversation(messages: ChatMessage[] | undefined, currentPrompt: string): Promise<ConversationContext>;
}

export class ConversationManagerService implements IConversationManagerService {
  private readonly _maxRecentMessages: number;
  private readonly _maxHistoryTokens: number;
  private readonly _enableSummarization: boolean;
  private readonly _tokenizer: TokenizerService;
  private readonly _client: AItClient;

  constructor(config: ConversationConfig = {}, tokenizer?: TokenizerService, client?: AItClient) {
    this._maxRecentMessages = Math.max(config.maxRecentMessages ?? 10, 1);
    this._maxHistoryTokens = Math.max(config.maxHistoryTokens ?? 2000, 100);
    this._enableSummarization = config.enableSummarization ?? true;
    this._tokenizer = tokenizer || getTokenizer();
    this._client = client || getAItClient();
  }

  async processConversation(messages: ChatMessage[] | undefined, currentPrompt: string): Promise<ConversationContext> {
    if (!messages || messages.length === 0) {
      return {
        recentMessages: [],
        estimatedTokens: this._tokenizer.countTokens(currentPrompt),
      };
    }

    const recentMessages = messages.slice(-this._maxRecentMessages);
    const olderMessages = messages.slice(0, -this._maxRecentMessages);

    const currentPromptTokens = this._tokenizer.countTokens(currentPrompt);
    const recentTokens = this._tokenizer.countMessages(recentMessages);

    if (!this._enableSummarization || olderMessages.length === 0) {
      const totalTokens = currentPromptTokens + recentTokens;

      if (totalTokens <= this._maxHistoryTokens) {
        return {
          recentMessages,
          estimatedTokens: totalTokens,
        };
      }

      const truncatedMessages = this._truncateMessages(recentMessages, this._maxHistoryTokens - currentPromptTokens);
      return {
        recentMessages: truncatedMessages,
        estimatedTokens: currentPromptTokens + this._tokenizer.countMessages(truncatedMessages),
      };
    }

    const summary = await this._summarizeMessages(olderMessages);
    const summaryTokens = this._tokenizer.countTokens(summary);

    const totalTokensWithSummary = currentPromptTokens + summaryTokens + recentTokens;

    if (totalTokensWithSummary <= this._maxHistoryTokens) {
      return {
        recentMessages,
        summary,
        estimatedTokens: totalTokensWithSummary,
      };
    }

    const remainingTokens = this._maxHistoryTokens - currentPromptTokens - summaryTokens;
    const truncatedRecentMessages = this._truncateMessages(recentMessages, Math.max(0, remainingTokens));

    return {
      recentMessages: truncatedRecentMessages,
      summary,
      estimatedTokens: currentPromptTokens + summaryTokens + this._tokenizer.countMessages(truncatedRecentMessages),
    };
  }

  private _truncateMessages(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    const truncated: ChatMessage[] = [];
    let currentTokens = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]!;
      const msgTokens = this._tokenizer.countTokens(`${msg.role}: ${msg.content}`);

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
      logger.warn("Failed to summarize conversation with LLM, falling back to simple concatenation", {
        error: error instanceof Error ? error.message : String(error),
      });

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
