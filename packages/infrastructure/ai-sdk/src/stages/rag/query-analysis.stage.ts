import { getLogger } from "@ait/core";
import { type QueryRewriterService, getQueryRewriter } from "../../services/generation/query-rewriter.service";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import {
  type FastQueryAnalysis,
  type IFastQueryAnalyzerService,
  getFastQueryAnalyzer,
} from "../../services/routing/fast-query-analyzer.service";
import type { QueryIntent } from "../../services/routing/query-intent.service";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { QueryAnalysisInput, QueryAnalysisOutput } from "../../types/stages";

const logger = getLogger();

export class QueryAnalysisStage implements IPipelineStage<QueryAnalysisInput, QueryAnalysisOutput> {
  readonly name = "query-analysis";

  private readonly fastAnalyzer: IFastQueryAnalyzerService;
  private readonly queryRewriter: QueryRewriterService;

  constructor(fastAnalyzer?: IFastQueryAnalyzerService, queryRewriter?: QueryRewriterService) {
    this.fastAnalyzer = fastAnalyzer || getFastQueryAnalyzer();
    this.queryRewriter = queryRewriter || getQueryRewriter();
  }

  async execute(input: QueryAnalysisInput, context: PipelineContext): Promise<QueryAnalysisOutput> {
    const startTime = Date.now();
    const endSpan = context.traceContext
      ? createSpanWithTiming(this.name, "rag", context.traceContext, { query: input.query.slice(0, 100) })
      : null;

    let queryToAnalyze = input.query;
    let analysis = this.fastAnalyzer.analyze(queryToAnalyze);

    // Check for pronouns that indicate context dependency
    const hasPronouns = /\b(it|them|that|those|these|he|she|they|him|her)\b/i.test(queryToAnalyze);

    // If query is ambiguous/broad or simple, and we have history, try to rewrite it
    if (
      input.messages &&
      input.messages.length > 0 &&
      (analysis.isBroadQuery || analysis.complexity === "simple" || analysis.entityTypes.length === 0 || hasPronouns)
    ) {
      const rewrittenQuery = await this.queryRewriter.rewriteQuery(input.query, input.messages);

      if (rewrittenQuery !== queryToAnalyze) {
        queryToAnalyze = rewrittenQuery;
        // Re-analyze with the rewritten query
        analysis = this.fastAnalyzer.analyze(queryToAnalyze);
      }
    }

    const intent = this._toQueryIntent(analysis);
    const shouldUseFastPath = this._determineFastPath(analysis);

    const output: QueryAnalysisOutput = {
      query: queryToAnalyze, // Return the potentially rewritten query
      intent,
      heuristics: {
        isTemporalQuery: analysis.isTemporalQuery,
        entityTypes: analysis.entityTypes,
        complexity: analysis.complexity,
      },
      shouldUseFastPath,
      traceContext: input.traceContext,
    };

    if (shouldUseFastPath) {
      logger.info("Fast path selected for simple query", {
        complexity: analysis.complexity,
        entityTypes: analysis.entityTypes,
        isTemporalQuery: analysis.isTemporalQuery,
      });
    }

    const duration = Date.now() - startTime;
    if (endSpan) {
      endSpan({
        primaryFocus: intent.primaryFocus,
        entityCount: intent.entityTypes?.length || 0,
        isTemporalQuery: intent.isTemporalQuery,
        isBroadQuery: analysis.isBroadQuery,
        complexity: analysis.complexity,
        shouldUseFastPath,
        duration,
        method: "heuristic",
        originalQuery: input.query !== queryToAnalyze ? input.query : undefined,
      });
    }

    return output;
  }

  private _toQueryIntent(analysis: FastQueryAnalysis): QueryIntent {
    return {
      entityTypes: analysis.entityTypes,
      isTemporalQuery: analysis.isTemporalQuery,
      timeReference: analysis.timeReference,
      primaryFocus: analysis.primaryFocus,
      complexityScore: analysis.complexity === "simple" ? 2 : analysis.complexity === "moderate" ? 5 : 8,
      requiredStyle: analysis.requiredStyle,
      topicShift: false,
    };
  }

  private _determineFastPath(analysis: FastQueryAnalysis): boolean {
    if (analysis.isBroadQuery) return false;
    if (analysis.complexity !== "simple") return false;
    if (analysis.isTemporalQuery) return false;
    if (analysis.entityTypes.length > 1) return false;

    return true;
  }
}
