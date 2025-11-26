import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { QueryAnalysisInput, QueryAnalysisOutput } from "../../types/stages";
import type { QueryIntent } from "../../services/routing/query-intent.service";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import { getFastQueryAnalyzer, type FastQueryAnalysis } from "../../services/routing/fast-query-analyzer.service";

export class QueryAnalysisStage implements IPipelineStage<QueryAnalysisInput, QueryAnalysisOutput> {
  readonly name = "query-analysis";

  private readonly fastAnalyzer = getFastQueryAnalyzer();

  async execute(input: QueryAnalysisInput, context: PipelineContext): Promise<QueryAnalysisOutput> {
    const startTime = Date.now();
    const endSpan = context.traceContext
      ? createSpanWithTiming(this.name, "rag", context.traceContext, { query: input.query.slice(0, 100) })
      : null;

    // Use fast heuristic-based analysis (< 1ms)
    const analysis = this.fastAnalyzer.analyze(input.query);

    // Convert FastQueryAnalysis to QueryIntent for backward compatibility
    const intent = this._toQueryIntent(analysis);

    const shouldUseFastPath = this._determineFastPath(analysis);

    const output: QueryAnalysisOutput = {
      query: input.query,
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
      console.info("Fast path selected for simple query", {
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
      });
    }

    return output;
  }

  /**
   * Convert FastQueryAnalysis to QueryIntent for backward compatibility
   */
  private _toQueryIntent(analysis: FastQueryAnalysis): QueryIntent {
    return {
      entityTypes: analysis.entityTypes,
      isTemporalQuery: analysis.isTemporalQuery,
      timeReference: analysis.timeReference,
      primaryFocus: analysis.primaryFocus,
      complexityScore: analysis.complexity === "simple" ? 2 : analysis.complexity === "moderate" ? 5 : 8,
      requiredStyle: analysis.requiredStyle,
      topicShift: false, // Heuristics can't detect topic shift without conversation history
    };
  }

  /**
   * Determine if query can use fast path (skip complex routing/retrieval)
   */
  private _determineFastPath(analysis: FastQueryAnalysis): boolean {
    // Broad queries need full pipeline
    if (analysis.isBroadQuery) return false;

    // Simple queries with single entity type can use fast path
    if (analysis.complexity !== "simple") return false;

    // Temporal queries need more processing
    if (analysis.isTemporalQuery) return false;

    // Multiple entity types need full routing
    if (analysis.entityTypes.length > 1) return false;

    return true;
  }
}
