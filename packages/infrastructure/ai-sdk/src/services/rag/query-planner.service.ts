import type { QueryPlannerConfig, QueryPlanResult } from "../../types/rag";
import { getAItClient } from "../../client/ai-sdk.client";

/**
 * Interface for query planning service
 */
export interface IQueryPlannerService {
  /**
   * Generate diverse query variants from user's question
   * @param userQuery - The original user query
   * @returns Query plan result with generated queries
   */
  planQueries(userQuery: string): Promise<QueryPlanResult>;
}

export class QueryPlannerService implements IQueryPlannerService {
  private readonly _queriesCount: number;
  private readonly _temperature: number;
  private readonly _topP: number;
  private readonly _minQueryCount: number;

  constructor(config: QueryPlannerConfig = {}) {
    this._queriesCount = Math.min(Math.max(config.queriesCount ?? 12, 4), 16);
    this._temperature = Math.min(Math.max(config.temperature ?? 0.8, 0), 1);
    this._topP = Math.min(Math.max(config.topP ?? 0.95, 0), 1);
    this._minQueryCount = config.minQueryCount ?? Math.floor(this._queriesCount * 0.5);
  }

  async planQueries(userQuery: string): Promise<QueryPlanResult> {
    try {
      const queries = await this._planQueriesWithLLM(userQuery);
      if (queries.length >= this._minQueryCount) {
        return {
          queries,
          source: "llm",
          isDiverse: true,
        };
      }
    } catch (error) {
      console.warn("LLM query planning failed, using heuristic fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Fallback to heuristics
    const queries = this._generateHeuristicQueries(userQuery);
    return {
      queries,
      source: "heuristic",
      isDiverse: false,
    };
  }

  private async _planQueriesWithLLM(userQuery: string): Promise<string[]> {
    const client = getAItClient();

    const instruction = this._buildInstruction();
    const composed = `${instruction}\n\nUser query:\n${userQuery.trim()}`;

    const result = await client.generationModel.doGenerate({
      prompt: composed,
      temperature: this._temperature,
      topP: this._topP,
    });

    const parsed = this._extractJsonArray(result.text);
    if (!Array.isArray(parsed)) {
      throw new Error("LLM did not return a valid JSON array");
    }

    const cleaned = this._normalizeAndDeduplicateQueries(parsed, this._queriesCount);
    if (cleaned.length < this._minQueryCount) {
      throw new Error(`Insufficient queries generated: ${cleaned.length} < ${this._minQueryCount}`);
    }

    return cleaned;
  }

  private _buildInstruction(): string {
    return [
      "You are AIt's query planner. Generate diverse search queries to retrieve relevant documents from a knowledge base containing code, music, tasks, and notes.",
      "",
      "CRITICAL RULES:",
      "1) PRESERVE domain signals: github, linear, spotify, twitter/x are REQUIRED if mentioned",
      "2) Generate DIVERSE perspectives: use synonyms, different granularities, and complementary angles",
      "3) Mix specific (exact terms) and semantic (conceptual) queries",
      "4) Each query must be 2-8 words, lowercase, natural language",
      "5) NO: IDs, URLs, hashtags, quotes, usernames (unless explicit), duplicates",
      "",
      "DIVERSITY STRATEGY:",
      "- Include 1 query that exactly matches key terms from the user's question",
      "- Include 2-3 queries with synonyms or paraphrases",
      "- Include 2-3 queries exploring related concepts or contexts",
      "- Include 1-2 queries with broader/narrower scope",
      "",
      "OUTPUT FORMAT:",
      `Return ONLY a valid JSON array of exactly ${this._queriesCount} unique strings. No markdown, no explanations.`,
      "",
      'Example: ["exact user terms", "synonym variation", "related concept", "broader context"]',
    ].join("\n");
  }

  private _generateHeuristicQueries(userQuery: string): string[] {
    const base = userQuery.trim().toLowerCase();
    const tokens = base.split(/\s+/);

    // Extract domain signals to preserve them
    const domains = tokens.filter((t) => ["github", "linear", "spotify", "twitter", "x.com"].includes(t));

    // Create variations that preserve domain context
    const withDomain = (phrase: string) => (domains.length > 0 ? `${domains.join(" ")} ${phrase}` : phrase);

    const queries = [
      base,
      withDomain("recent work"),
      withDomain("projects"),
      withDomain("current focus"),
      "related tasks",
      "similar content",
      "contextual information",
      "relevant documents",
    ];

    return this._normalizeAndDeduplicateQueries(queries, Math.min(8, this._queriesCount));
  }

  private _normalizeAndDeduplicateQueries(candidates: unknown[], limit: number): string[] {
    const normlize = (s: string) =>
      s
        .toLowerCase()
        .replace(/["'`]/g, "")
        .replace(/[.,;:!?(){}\[\]\\/+*_#@%^&=<>|~]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const isValid = (text: string) => {
      if (!text) return false;
      const words = text.split(" ").filter(Boolean);

      return words.length >= 2 && words.length <= 8;
    };

    const seen = new Set<string>();
    const result: string[] = [];

    for (const candidate of candidates) {
      if (typeof candidate !== "string") continue;
      const normalized = normlize(candidate);
      if (!isValid(normalized)) continue;
      if (seen.has(normalized)) continue;

      seen.add(normalized);
      result.push(normalized);

      if (result.length >= limit) break;
    }

    return result;
  }

  private _extractJsonArray(text: string): unknown[] | null {
    try {
      const direct = JSON.parse(text);
      return Array.isArray(direct) ? direct : null;
    } catch {}

    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        const parsed = JSON.parse(fence[1]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        // Continue to other methods
      }
    }

    const bracket = text.match(/\[([\s\S]*?)\]/);
    if (bracket) {
      try {
        const parsed = JSON.parse(bracket[0]);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        // Failed all methods
      }
    }

    return null;
  }
}
