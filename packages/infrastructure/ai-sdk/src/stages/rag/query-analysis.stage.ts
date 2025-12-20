import type { EntityType } from "@ait/core";
import { VALID_ENTITY_TYPES, getLogger } from "@ait/core";
import {
  type CollectionVendor,
  getAllCollections,
  getCollectionsByEntityTypes,
  getEnabledVendors,
} from "../../config/collections.config";
import { QueryRewriterService } from "../../services/generation/query-rewriter.service";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import {
  type FastQueryAnalysis,
  FastQueryAnalyzerService,
  type IFastQueryAnalyzerService,
} from "../../services/routing/fast-query-analyzer.service";
import {
  type IQueryIntentService,
  type QueryIntent,
  QueryIntentService,
} from "../../services/routing/query-intent.service";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { CollectionRouterResult, CollectionWeight } from "../../types/collections";
import type { QueryAnalysisInput, QueryAnalysisOutput } from "../../types/stages";

const logger = getLogger();

export class QueryAnalysisStage implements IPipelineStage<QueryAnalysisInput, QueryAnalysisOutput> {
  readonly name = "query-analysis";

  private readonly _fastAnalyzer: IFastQueryAnalyzerService;
  private readonly _intentService: IQueryIntentService;
  private readonly _queryRewriter: QueryRewriterService;

  constructor(
    _fastAnalyzer?: IFastQueryAnalyzerService,
    _intentService?: IQueryIntentService,
    _queryRewriter?: QueryRewriterService,
  ) {
    this._fastAnalyzer = _fastAnalyzer || new FastQueryAnalyzerService();
    this._intentService = _intentService || new QueryIntentService();
    this._queryRewriter = _queryRewriter || new QueryRewriterService();
  }

  async execute(input: QueryAnalysisInput, context: PipelineContext): Promise<QueryAnalysisOutput> {
    const startTime = Date.now();
    const endSpan = context.traceContext
      ? createSpanWithTiming("rag/query-analysis", "routing", context.traceContext, {
          query: input.query.slice(0, 100),
          messageCount: input.messages?.length || 0,
        })
      : null;

    let queryToAnalyze = input.query;
    const enabledVendors = getEnabledVendors();
    const heuristicAnalysis = this._fastAnalyzer.analyze(queryToAnalyze);
    const hasHistory = !!(input.messages && input.messages.length > 0);

    let intent: QueryIntent | undefined;
    let analysisMethod: "llm" | "heuristic" = "llm";

    try {
      intent = await this._intentService.analyzeIntent(queryToAnalyze, input.messages, context.traceContext);

      // Keyword-based RAG boost: Override LLM decision if connector keywords detected
      intent = this._applyKeywordBasedRAGBoost(intent, queryToAnalyze);
    } catch (error) {
      logger.warn("LLM intent analysis failed, falling back to heuristics", {
        error: error instanceof Error ? error.message : String(error),
      });
      intent = this._toQueryIntent(heuristicAnalysis);
      analysisMethod = "heuristic";
    }

    const needsRewrite = this._shouldRewriteQuery(queryToAnalyze, intent, hasHistory);
    let wasRewritten = false;
    if (needsRewrite) {
      const rewrittenQuery = await this._queryRewriter.rewriteQuery(input.query, input.messages!);

      if (rewrittenQuery !== queryToAnalyze) {
        queryToAnalyze = rewrittenQuery;
        wasRewritten = true;
        try {
          intent = await this._intentService.analyzeIntent(queryToAnalyze, input.messages, context.traceContext);
          analysisMethod = "llm";
        } catch (error) {
          logger.warn("Rewritten LLM intent analysis failed, using current intent", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const needsRAG = intent.needsRAG;
    const routingResult = await this._buildRoutingResult(intent, queryToAnalyze, enabledVendors);

    const output: QueryAnalysisOutput = {
      query: queryToAnalyze,
      intent,
      messages: input.messages,
      needsRAG,
      traceContext: input.traceContext,
      routingResult,
    };

    const duration = Date.now() - startTime;
    const telemetryData = {
      analysisMethod,
      needsRAG,
      strategy: routingResult.strategy,
      collections: routingResult.selectedCollections.map((c) => c.vendor),
      wasRewritten,
      queryLength: queryToAnalyze.length,
      duration,
    };

    if (endSpan) endSpan(telemetryData);

    logger.info(`Stage [${this.name}] completed`, telemetryData);

    return output;
  }

  private async _buildRoutingResult(
    intent: QueryIntent,
    _query: string,
    enabledVendors: Set<CollectionVendor>,
  ): Promise<CollectionRouterResult> {
    if (!intent.needsRAG) {
      return {
        selectedCollections: [],
        reasoning: "Query does not require RAG - skipping retrieval",
        strategy: "no-retrieval",
        confidence: 1.0,
        suggestedEntityTypes: undefined,
      };
    }

    // Intent has no entity types → all enabled collections
    if (intent.entityTypes.length === 0) {
      const selectedCollections = this._mapCollectionsToWeights(
        getAllCollections(),
        enabledVendors,
        "No specific entity types detected - all collections",
      );

      return {
        selectedCollections,
        reasoning: "No specific entity types detected - searching all collections",
        strategy: "all-collections",
        confidence: 0.6,
        suggestedEntityTypes: intent.entityTypes,
      };
    }

    const validEntityTypes = this._validateEntityTypes(intent.entityTypes);
    const targetCollections = getCollectionsByEntityTypes(validEntityTypes);
    const selectedCollections = this._mapCollectionsToWeights(
      targetCollections,
      enabledVendors,
      `Entity-based routing: ${validEntityTypes.join(", ")}`,
      1.0,
    );

    // Fallback if no collections matched
    if (selectedCollections.length === 0) {
      const selectedCollections = this._mapCollectionsToWeights(
        getAllCollections(),
        enabledVendors,
        "Fallback - no matching collections for entity types",
      );

      return {
        selectedCollections,
        reasoning: `Entity types [${validEntityTypes.join(", ")}] did not match any collections`,
        strategy: "all-collections",
        confidence: 0.4,
        suggestedEntityTypes: validEntityTypes,
      };
    }

    return {
      selectedCollections,
      reasoning: `Entity-based routing for: ${validEntityTypes.join(", ")}`,
      strategy: selectedCollections.length === 1 ? "single-collection" : "multi-collection",
      confidence: 0.9,
      suggestedEntityTypes: validEntityTypes,
    };
  }

  private _mapCollectionsToWeights(
    collections: readonly { vendor: CollectionVendor; defaultWeight: number }[],
    enabledVendors: Set<CollectionVendor>,
    reasoning: string,
    weight?: number,
  ): CollectionWeight[] {
    return collections
      .filter((c) => enabledVendors.has(c.vendor))
      .map((c) => ({
        vendor: c.vendor,
        weight: weight ?? c.defaultWeight,
        reasoning,
      }));
  }

  private _shouldRewriteQuery(query: string, intent: QueryIntent, hasHistory: boolean): boolean {
    if (!hasHistory) return false;

    // 1. Check for explicit context markers (pronouns, demonstratives)
    const contextMarkers =
      /\b(it|them|that|those|these|he|she|they|him|her|this|previous|following|last|past|above|below|more|again|well|bene)\b/i;
    if (contextMarkers.test(query)) return true;

    // 3. If LLM explicitly detected a continuation (topicShift: false), we likely need to rewrite
    // to include the context in the query string for better retrieval.
    if (intent.topicShift === false) return true;

    // 4. Ambiguity check: Short query + No entities detected -> Likely depends on context
    // e.g. "Why?" or "Explain more" or "Show code"
    const wordCount = query.trim().split(/\s+/).length;
    if (intent.entityTypes.length === 0 && wordCount <= 3) return true;

    return false;
  }

  private _validateEntityTypes(entityTypes: string[]): EntityType[] {
    const validTypesSet = new Set<string>(VALID_ENTITY_TYPES);
    return entityTypes.filter((type): type is EntityType => validTypesSet.has(type));
  }

  private _toQueryIntent(analysis: FastQueryAnalysis): QueryIntent {
    const needsRAG = analysis.entityTypes.length > 0 || !analysis.isGreeting;

    return {
      entityTypes: analysis.entityTypes,
      isTemporalQuery: analysis.isTemporalQuery,
      timeReference: analysis.timeReference,
      primaryFocus: analysis.primaryFocus,
      complexityScore: analysis.complexity === "simple" ? 2 : analysis.complexity === "moderate" ? 5 : 8,
      requiredStyle: analysis.requiredStyle,
      topicShift: true,
      needsRAG: needsRAG,
      needsTools: false, // Heuristic fallback: can't determine tool needs, default to false
    };
  }

  private _applyKeywordBasedRAGBoost(intent: QueryIntent, query: string): QueryIntent {
    if (intent.needsRAG) {
      return intent;
    }

    const heuristicAnalysis = this._fastAnalyzer.analyze(query);
    if (heuristicAnalysis.entityTypes.length > 0) {
      logger.info("Keyword-based RAG boost applied", {
        query: query.slice(0, 50),
        detectedEntities: heuristicAnalysis.entityTypes,
        originalNeedsRAG: intent.needsRAG,
      });

      return {
        ...intent,
        needsRAG: true,
        entityTypes: intent.entityTypes.length > 0 ? intent.entityTypes : heuristicAnalysis.entityTypes,
      };
    }

    return intent;
  }
}
