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

    const analysis = this.fastAnalyzer.analyze(input.query);
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
