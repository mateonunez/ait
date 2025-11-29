import { getAItClient, type AItClient } from "../../client/ai-sdk.client";
import type { ChatMessage } from "../../types/chat";
import { getLogger } from "@ait/core";

const logger = getLogger();

export interface IQueryRewriterService {
  rewriteQuery(query: string, messages: ChatMessage[]): Promise<string>;
}

export class QueryRewriterService implements IQueryRewriterService {
  private readonly _client: AItClient;

  constructor(client?: AItClient) {
    this._client = client || getAItClient();
  }

  async rewriteQuery(query: string, messages: ChatMessage[]): Promise<string> {
    if (!messages || messages.length === 0) {
      return query;
    }

    // Simple heuristic: if query is long and specific, it might not need rewriting
    // But "Who of them..." is short, so we rely on the LLM to decide.
    // We only send the last few messages to save context window and latency.
    const recentHistory = messages.slice(-5);

    try {
      const prompt = this._buildRewritePrompt(query, recentHistory);

      const response = await this._client.generateText({
        prompt,
        temperature: 0.1, // Very low temperature for precise rewriting
      });

      const rewritten = response.text.trim();

      if (rewritten.toLowerCase() !== query.toLowerCase()) {
        logger.debug("Query rewritten", { original: query, rewritten });
      }

      return rewritten;
    } catch (error) {
      logger.warn("Failed to rewrite query, using original", { error });
      return query;
    }
  }

  private _buildRewritePrompt(query: string, messages: ChatMessage[]): string {
    const historyText = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

    return `You are a helpful assistant that rewrites user queries to be self-contained and explicit, based on the conversation history.
    
Conversation History:
${historyText}

Current User Query: "${query}"

Task: Rewrite the "Current User Query" to resolve any ambiguous references (like "them", "it", "that", "the list") using the context from the history. 
If the query is already self-contained and clear, return it exactly as is.
Do not answer the query. Only return the rewritten query string.

Rewritten Query:`;
  }
}

/**
 * Singleton instance for performance
 */
let _instance: QueryRewriterService | null = null;

export function getQueryRewriter(): QueryRewriterService {
  if (!_instance) {
    _instance = new QueryRewriterService();
  }
  return _instance;
}
