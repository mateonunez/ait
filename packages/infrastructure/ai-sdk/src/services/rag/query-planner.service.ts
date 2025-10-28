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
  private static readonly DOMAIN_KEYWORDS = ["github", "linear", "spotify", "twitter", "x.com", "x"];

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
    console.info("Query planning started", { userQuery: userQuery.slice(0, 100) });

    // Check if model supports tools/structured generation
    const client = getAItClient();
    const modelSupportsTools = client.generationModelConfig.supportsTools ?? true;

    if (!modelSupportsTools) {
      console.info("Model doesn't support tools, using heuristic query planning");
      const queries = await this._generateHeuristicQueries(userQuery);
      console.info("Heuristic query plan generated", {
        queryCount: queries.length,
        queries: queries.slice(0, 5),
      });
      return {
        queries,
        source: "heuristic",
        isDiverse: false,
      };
    }

    try {
      const queries = await this._planQueriesWithLLM(userQuery);
      if (queries.length >= this._minQueryCount) {
        console.info("LLM query plan generated", {
          queryCount: queries.length,
          queries: queries.slice(0, 5),
        });
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
    const queries = await this._generateHeuristicQueries(userQuery);
    console.info("Heuristic query plan generated", {
      queryCount: queries.length,
      queries: queries.slice(0, 5),
    });
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

    console.debug("LLM query planner response", {
      responseLength: result.text.length,
      responsePreview: result.text.slice(0, 200),
    });

    const parsed = this._extractJsonArray(result.text);
    if (!Array.isArray(parsed)) {
      console.warn("LLM did not return valid JSON array", {
        response: result.text.slice(0, 500),
      });
      throw new Error("LLM did not return a valid JSON array");
    }

    let cleaned = this._normalizeAndDeduplicateQueries(parsed, this._queriesCount);

    // Ensure domain preservation: if original query has domain keywords,
    // at least half of the generated queries should contain them
    cleaned = this._ensureDomainPreservation(userQuery, cleaned);

    if (cleaned.length < this._minQueryCount) {
      console.warn("Insufficient queries after cleaning", {
        generated: parsed.length,
        cleaned: cleaned.length,
        minimum: this._minQueryCount,
      });
      throw new Error(`Insufficient queries generated: ${cleaned.length} < ${this._minQueryCount}`);
    }

    return cleaned;
  }

  private _buildInstruction(): string {
    const domainList = `${QueryPlannerService.DOMAIN_KEYWORDS.slice(0, -2).join(", ")}, twitter/x`;

    return [
      "You are AIt's query planner. Generate diverse search queries to retrieve relevant documents from a knowledge base containing code, music, tasks, and notes.",
      "",
      "CRITICAL RULES:",
      `1) PRESERVE domain signals: ${domainList} are REQUIRED if mentioned`,
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

  private async _generateHeuristicQueries(userQuery: string): Promise<string[]> {
    const base = userQuery.trim().toLowerCase();

    // Try LLM-based entity extraction first
    try {
      const entities = await this._extractEntitiesWithLLM(userQuery);
      return this._buildQueriesFromEntities(base, entities);
    } catch (error) {
      console.debug("LLM entity extraction failed, using basic fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Simple fallback: basic query variations
    return this._buildBasicQueryVariations(base);
  }

  private async _extractEntitiesWithLLM(userQuery: string): Promise<{
    domains: string[];
    entities: string[];
    intent: string;
  }> {
    const client = getAItClient();
    const domainExamples = QueryPlannerService.DOMAIN_KEYWORDS.slice(0, 5).join(", ");

    const instruction = [
      "Extract key information from the user query for search optimization.",
      "",
      "Identify:",
      `1. DOMAINS: platforms mentioned (${domainExamples}, etc.)`,
      "2. ENTITIES: key nouns/objects (repository, track, issue, task, project, etc.)",
      "3. INTENT: what the user wants (recent, latest, my work, etc.)",
      "",
      "Rules:",
      "- Output in English regardless of input language",
      "- Keep it simple and focused",
      "- Return empty arrays if nothing detected",
      "",
      'Output ONLY valid JSON: {"domains": ["github"], "entities": ["repository"], "intent": "recent"}',
      "",
      `User query: ${userQuery}`,
    ].join("\n");

    const result = await client.generationModel.doGenerate({
      prompt: instruction,
      temperature: 0.3,
      topP: 0.9,
    });

    console.debug("Entity extraction response", {
      responsePreview: result.text.slice(0, 200),
    });

    const parsed = this._extractJson(result.text) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid JSON response from entity extraction");
    }

    return {
      domains: Array.isArray(parsed.domains)
        ? parsed.domains.filter((d: unknown): d is string => typeof d === "string")
        : [],
      entities: Array.isArray(parsed.entities)
        ? parsed.entities.filter((e: unknown): e is string => typeof e === "string")
        : [],
      intent: typeof parsed.intent === "string" ? parsed.intent : "",
    };
  }

  private _buildQueriesFromEntities(
    base: string,
    entities: { domains: string[]; entities: string[]; intent: string },
  ): string[] {
    const queries: string[] = [base];

    const { domains, entities: extractedEntities, intent } = entities;

    console.debug("Building queries from extracted entities", {
      domains,
      entities: extractedEntities,
      intent,
    });

    // Build domain-focused queries
    if (domains.length > 0) {
      const domainStr = domains.join(" ");

      queries.push(domainStr);

      if (intent) {
        queries.push(`${domainStr} ${intent}`);
      }

      if (extractedEntities.length > 0) {
        for (const entity of extractedEntities.slice(0, 2)) {
          queries.push(`${domainStr} ${entity}`);
          if (intent) {
            queries.push(`${domainStr} ${intent} ${entity}`);
          }
        }
      }
    } else if (extractedEntities.length > 0) {
      // No domain but have entities
      for (const entity of extractedEntities.slice(0, 3)) {
        queries.push(entity);
        if (intent) {
          queries.push(`${intent} ${entity}`);
        }
      }
    } else if (intent) {
      // Only intent
      queries.push(intent);
    }

    return this._normalizeAndDeduplicateQueries(queries, Math.min(this._queriesCount, 12));
  }

  private _buildBasicQueryVariations(base: string): string[] {
    const tokens = base.split(/\s+/);

    const queries = [
      base,
      tokens
        .slice(0, 3)
        .join(" "), // First 3 words
      tokens
        .slice(-3)
        .join(" "), // Last 3 words
      tokens.length > 1 ? tokens.slice(0, Math.ceil(tokens.length / 2)).join(" ") : base, // First half
    ];

    return this._normalizeAndDeduplicateQueries(queries, Math.min(8, this._queriesCount));
  }

  private _extractJson(text: string): unknown | null {
    try {
      return JSON.parse(text);
    } catch {}

    // Try to extract from markdown fence
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1]);
      } catch {}
    }

    // Try to extract JSON object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {}
    }

    return null;
  }

  private _ensureDomainPreservation(userQuery: string, queries: string[]): string[] {
    // Extract domain keywords from the original query
    const lowerQuery = userQuery.toLowerCase();
    const detectedDomains = QueryPlannerService.DOMAIN_KEYWORDS.filter((domain) => lowerQuery.includes(domain));

    if (detectedDomains.length === 0) {
      return queries; // No domain keywords, no need to enforce preservation
    }

    // Count how many queries contain the domain keywords
    const queriesWithDomain = queries.filter((q) => detectedDomains.some((domain) => q.toLowerCase().includes(domain)));

    const targetCount = Math.ceil(queries.length * 0.6); // At least 60% should have domain

    if (queriesWithDomain.length >= targetCount) {
      console.debug("Domain keywords adequately preserved", {
        domains: detectedDomains,
        queriesWithDomain: queriesWithDomain.length,
        total: queries.length,
      });
      return queries;
    }

    // Need to add domain keywords to some queries
    console.warn("Insufficient domain preservation, augmenting queries", {
      domains: detectedDomains,
      queriesWithDomain: queriesWithDomain.length,
      target: targetCount,
    });

    const result = [...queries];
    const domainPrefix = detectedDomains.join(" ");

    // Add domain-prefixed versions of queries that don't have them
    for (const query of queries) {
      if (result.length >= this._queriesCount) break;
      if (!detectedDomains.some((d) => query.toLowerCase().includes(d))) {
        const augmented = `${domainPrefix} ${query}`;
        if (!result.includes(augmented)) {
          result.push(augmented);
        }
      }
    }

    return result.slice(0, this._queriesCount);
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
