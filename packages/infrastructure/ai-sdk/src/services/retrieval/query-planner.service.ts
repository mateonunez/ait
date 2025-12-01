import { getLogger } from "@ait/core";
import { z } from "zod";
import { getAItClient } from "../../client/ai-sdk.client";
import { recordGeneration, recordSpan } from "../../telemetry/telemetry.middleware";
import type { QueryPlanResult, QueryPlannerConfig } from "../../types/rag";
import type { TraceContext } from "../../types/telemetry";
import { type ITextNormalizationService, TextNormalizationService } from "../metadata/text-normalization.service";
import { buildQueryPlanningPrompt } from "../prompts/planning.prompts";
import { type IQueryHeuristicService, QueryHeuristicService } from "../routing/query-heuristic.service";
import { type IQueryIntentService, type QueryIntent, QueryIntentService } from "../routing/query-intent.service";

const logger = getLogger();

export interface IQueryPlannerService {
  planQueries(userQuery: string, traceContext?: TraceContext | null): Promise<QueryPlanResult>;
}

const QueryPlanSchema = z.object({
  queries: z.array(z.string()).describe("Search query variants"),
  tags: z.array(z.string()).optional().describe("Optional semantic tags"),
});

type QueryPlanResponse = z.infer<typeof QueryPlanSchema>;

export class QueryPlannerService implements IQueryPlannerService {
  private readonly _queriesCount: number;
  private readonly _temperature: number;
  private readonly _minQueryCount: number;
  private readonly _heuristics: IQueryHeuristicService;
  private readonly _intentService: IQueryIntentService;
  private readonly _textNormalizer: ITextNormalizationService;

  constructor(
    config: QueryPlannerConfig = {},
    heuristics: IQueryHeuristicService = new QueryHeuristicService(),
    intentService: IQueryIntentService = new QueryIntentService(),
    textNormalizer?: ITextNormalizationService,
  ) {
    // Prefer a small initial set; retrieval layer can expand if recall is low
    this._queriesCount = Math.min(Math.max(config.queriesCount ?? 6, 4), 12);
    this._temperature = Math.min(Math.max(config.temperature ?? 0.7, 0), 1);
    const configuredMin = config.minQueryCount ?? 4;
    this._minQueryCount = Math.min(Math.max(configuredMin, 1), this._queriesCount);
    this._heuristics = heuristics;
    this._intentService = intentService;
    this._textNormalizer = textNormalizer || new TextNormalizationService();
  }

  async planQueries(userQuery: string, traceContext?: TraceContext | null): Promise<QueryPlanResult> {
    const startTime = Date.now();
    const client = getAItClient();

    // Step 1: Use LLM to understand intent
    let intent: QueryIntent | undefined;
    try {
      intent = await this._intentService.analyzeIntent(userQuery);

      if (traceContext && intent) {
        recordSpan(
          "query-intent-analysis",
          "query_planning",
          traceContext,
          { query: userQuery.slice(0, 100) },
          {
            entityTypes: intent.entityTypes,
            isTemporalQuery: intent.isTemporalQuery,
            timeReference: intent.timeReference,
          },
        );
      }
    } catch (error) {
      logger.warn("Failed to analyze query intent, continuing without it", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const prompt = buildQueryPlanningPrompt(
        userQuery,
        this._queriesCount,
        intent?.entityTypes,
        intent?.isTemporalQuery,
        intent?.timeReference,
      );

      const object = await client.generateStructured<QueryPlanResponse>({
        schema: QueryPlanSchema,
        temperature: this._temperature,
        prompt,
      });

      // Normalize and validate queries
      const rawQueries = (object.queries || []).map((q) => q.trim()).filter((q) => q.length >= 2 && q.length <= 100);

      const queries = this._ensureUserQuery(userQuery, rawQueries);
      let cleaned = this._deduplicateQueries(queries, this._queriesCount);

      const heuristicTags = this._heuristics.inferTags(userQuery);
      let tags = this._mergeTags(object.tags, heuristicTags);
      let planSource: QueryPlanResult["source"] = "llm";
      let fallbackApplied = false;

      if (cleaned.length < this._minQueryCount) {
        logger.warn("Query planner generated fewer queries than expected", {
          expected: this._queriesCount,
          minRequired: this._minQueryCount,
          received: cleaned.length,
        });

        const hadLlmQueries = cleaned.length > 0;
        const fallbackPlan = this._heuristics.buildFallbackPlan(userQuery, this._queriesCount);
        const merged = this._mergeQueries(cleaned, fallbackPlan.queries, this._queriesCount);
        cleaned = merged;
        fallbackApplied = true;

        tags = this._mergeTags(tags, fallbackPlan.tags);

        planSource = hadLlmQueries && cleaned.length > 0 ? "llm" : fallbackPlan.source;
      }

      if (cleaned.length === 0) {
        logger.warn("No valid queries after LLM generation, using heuristic fallback");
        return this._buildHeuristicPlan(userQuery);
      }

      const isDiverse = cleaned.length >= this._minQueryCount;

      // Record query planning span
      if (traceContext) {
        recordGeneration(
          traceContext,
          "query-decomposition",
          {
            query: userQuery.slice(0, 100),
            targetQueryCount: this._queriesCount,
          },
          {
            queries: cleaned,
            tags,
          },
          {
            model: client.generationModelConfig.name,
            temperature: this._temperature,
          },
        );

        recordSpan(
          "query-planning",
          "query_planning",
          traceContext,
          {
            query: userQuery.slice(0, 100),
          },
          {
            queryCount: cleaned.length,
            planSource,
            isDiverse,
            usedFallback: fallbackApplied,
            duration: Date.now() - startTime,
          },
        );
      }

      return {
        queries: cleaned,
        tags,
        source: planSource,
        isDiverse,
        usedFallback: fallbackApplied,
        originalQuery: userQuery,
        intent,
      };
    } catch (error) {
      logger.error("Query planning failed", {
        error: error instanceof Error ? error.message : String(error),
        userQuery: userQuery.slice(0, 100),
      });
      return this._buildHeuristicPlan(userQuery, traceContext);
    }
  }

  private _buildHeuristicPlan(userQuery: string, traceContext?: TraceContext | null): QueryPlanResult {
    const fallback = this._heuristics.buildFallbackPlan(userQuery, this._queriesCount);
    const ensuredQueries = this._ensureUserQuery(userQuery, fallback.queries || []);
    const deduped = this._deduplicateQueries(ensuredQueries, this._queriesCount);
    const heuristicTags = this._heuristics.inferTags(userQuery);
    const tags = this._mergeTags(fallback.tags, heuristicTags);
    return {
      queries: deduped,
      tags,
      source: "heuristic",
      isDiverse: deduped.length >= this._minQueryCount,
      usedFallback: true,
      originalQuery: userQuery,
      intent: undefined,
    };
  }

  private _deduplicateQueries(queries: string[], limit: number): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const query of queries) {
      const trimmed = query.trim();
      const normalized = this._textNormalizer.normalizeForMatching(trimmed);
      const words = normalized.split(" ").filter(Boolean);

      if (words.length >= 2 && words.length <= 8 && !seen.has(normalized)) {
        seen.add(normalized);
        result.push(normalized);
        if (result.length >= limit) break;
      }
    }

    return result;
  }

  private _ensureUserQuery(userQuery: string, queries: string[]): string[] {
    const result = [...queries];
    const trimmed = userQuery.trim();
    if (!trimmed) return result;

    const normalizedOriginal = this._textNormalizer.normalizeForMatching(trimmed);
    const hasOriginal = result.some((q) => this._textNormalizer.normalizeForMatching(q) === normalizedOriginal);

    if (!hasOriginal) {
      result.unshift(trimmed);
    }

    return result;
  }

  private _mergeQueries(primary: string[], fallback: string[], limit: number): string[] {
    const combined = [...primary, ...(fallback || [])];
    return this._deduplicateQueries(combined, limit);
  }

  private _mergeTags(...sources: Array<string[] | undefined>): string[] | undefined {
    const tagMap = new Map<string, string>();

    for (const source of sources) {
      if (!source) continue;
      for (const tag of source) {
        const trimmed = tag.trim();
        if (!trimmed) continue;
        const normalized = trimmed.toLowerCase();
        if (!tagMap.has(normalized)) {
          tagMap.set(normalized, trimmed);
        }
      }
    }

    return tagMap.size > 0 ? Array.from(tagMap.values()) : undefined;
  }
}
