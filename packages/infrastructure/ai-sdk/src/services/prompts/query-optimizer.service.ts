import { getLogger } from "@ait/core";
import { eng, removeStopwords } from "stopword";
import { type AItClient, getAItClient } from "../../client/ai-sdk.client";

const logger = getLogger();

export interface QueryOptimizationOptions {
  enableLLM?: boolean;
  language?: string;
}

export interface IQueryOptimizerService {
  optimize(query: string, options: QueryOptimizationOptions): Promise<string>;
}

export class QueryOptimizerService implements IQueryOptimizerService {
  private readonly _client: AItClient;

  constructor(client?: AItClient) {
    this._client = client || getAItClient();
  }

  /**
   * Optimizes a search query for better retrieval performance.
   */
  async optimize(query: string, options: QueryOptimizationOptions = {}): Promise<string> {
    let optimized = query.trim();

    // 1. Rule-based: Basic normalization
    optimized = this._normalizeBasic(optimized);

    // 2. Rule-based: Stopword removal for long queries
    if (optimized.split(/\s+/).length > 5) {
      optimized = this._removeStopwords(optimized);
    }

    // 3. LLM-based rewrite (if enabled and complex)
    if (options.enableLLM && this._isComplex(optimized)) {
      optimized = await this._llmOptimize(optimized);
    }

    if (optimized !== query) {
      logger.debug("[✍️] Query optimized", { original: query, optimized });
    }

    return optimized;
  }

  private _normalizeBasic(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s\-\.\?]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private _removeStopwords(query: string): string {
    const tokens = query.split(/\s+/);
    // Use english stopwords by default, could be extended based on options
    return removeStopwords(tokens, eng).join(" ");
  }

  private _isComplex(query: string): string | boolean {
    const tokens = query.split(/\s+/);
    return tokens.length > 8 || query.includes("?");
  }

  private async _llmOptimize(query: string): Promise<string> {
    try {
      const prompt = `
        Optimize the following search query for a vector database.
        The goal is to extract the main entities and intent while removing conversational noise.
        
        Original Query: "${query}"
        
        Task:
        1. Identify the core search terms and entities.
        2. Expand synonyms if helpful.
        3. Maintain the original meaning.
        4. Return only the optimized query string, nothing else.
        
        Optimized Search Query:`;

      const response = await this._client.generateText({
        prompt,
        temperature: 0.1,
      });

      return response.text.trim();
    } catch (error) {
      logger.warn("[✍️] LLM optimization failed, using original query", { error });
      return query;
    }
  }
}

let _instance: QueryOptimizerService | null = null;

export function getQueryOptimizer(): QueryOptimizerService {
  if (!_instance) {
    _instance = new QueryOptimizerService();
  }
  return _instance;
}
