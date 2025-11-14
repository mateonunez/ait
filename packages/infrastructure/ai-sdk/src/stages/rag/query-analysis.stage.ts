import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { QueryAnalysisInput, QueryAnalysisOutput } from "../../types/stages";
import { QueryIntentService } from "../../services/routing/query-intent.service";
import type { QueryIntent } from "../../services/routing/query-intent.service";
import { recordSpan } from "../../telemetry/telemetry.middleware";

export class QueryAnalysisStage implements IPipelineStage<QueryAnalysisInput, QueryAnalysisOutput> {
  readonly name = "query-analysis";

  private readonly intentService: QueryIntentService;

  constructor() {
    this.intentService = new QueryIntentService();
  }

  async execute(input: QueryAnalysisInput, context: PipelineContext): Promise<QueryAnalysisOutput> {
    const startTime = Date.now();

    const intent = await this.intentService.analyzeIntent(input.query);

    const complexity = this._determineComplexity(input.query, intent.entityTypes?.length || 0);
    const shouldUseFastPath = this._determineFastPath(complexity, intent);

    const output: QueryAnalysisOutput = {
      query: input.query,
      intent,
      heuristics: {
        isTemporalQuery: intent.isTemporalQuery,
        entityTypes: intent.entityTypes || [],
        complexity,
      },
      shouldUseFastPath,
      traceContext: input.traceContext,
    };

    if (shouldUseFastPath) {
      console.info("Fast path selected for simple query", {
        complexity,
        entityTypes: intent.entityTypes,
        isTemporalQuery: intent.isTemporalQuery,
      });
    }

    if (context.traceContext) {
      recordSpan(
        this.name,
        "rag",
        context.traceContext,
        { query: input.query.slice(0, 100) },
        {
          primaryFocus: intent.primaryFocus,
          entityCount: intent.entityTypes?.length || 0,
          isTemporalQuery: intent.isTemporalQuery,
          complexity,
          shouldUseFastPath,
          duration: Date.now() - startTime,
        },
      );
    }

    return output;
  }

  private _determineComplexity(query: string, entityCount: number): "simple" | "moderate" | "complex" {
    const wordCount = query.split(/\s+/).length;

    if (wordCount < 5 && entityCount <= 1) return "simple";
    if (wordCount < 15 && entityCount <= 2) return "moderate";
    return "complex";
  }

  private _determineFastPath(complexity: "simple" | "moderate" | "complex", intent: QueryIntent): boolean {
    if (complexity !== "simple") return false;
    if (intent.isTemporalQuery) return false;

    const entityCount = intent.entityTypes?.length || 0;
    if (entityCount > 1) return false;

    return true;
  }
}
