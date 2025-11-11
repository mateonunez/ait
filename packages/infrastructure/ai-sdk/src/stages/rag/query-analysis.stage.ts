import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { QueryAnalysisInput, QueryAnalysisOutput } from "../../types/stages";
import { QueryIntentService } from "../../services/routing/query-intent.service";
import { QueryHeuristicService } from "../../services/routing/query-heuristic.service";
import { recordSpan } from "../../telemetry/telemetry.middleware";

export class QueryAnalysisStage implements IPipelineStage<QueryAnalysisInput, QueryAnalysisOutput> {
  readonly name = "query-analysis";

  private readonly intentService: QueryIntentService;
  private readonly heuristicService: QueryHeuristicService;

  constructor() {
    this.intentService = new QueryIntentService();
    this.heuristicService = new QueryHeuristicService();
  }

  async execute(input: QueryAnalysisInput, context: PipelineContext): Promise<QueryAnalysisOutput> {
    const startTime = Date.now();

    const intent = await this.intentService.analyzeIntent(input.query);
    const inferredTags = this.heuristicService.inferTags(input.query);

    const complexity = this.determineComplexity(input.query, intent.entityTypes?.length || 0);

    const output: QueryAnalysisOutput = {
      query: input.query,
      intent,
      heuristics: {
        isTemporalQuery: intent.isTemporalQuery,
        entityTypes: intent.entityTypes || [],
        complexity,
      },
      traceContext: input.traceContext,
    };

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
          duration: Date.now() - startTime,
        },
      );
    }

    return output;
  }

  private determineComplexity(query: string, entityCount: number): "simple" | "moderate" | "complex" {
    const wordCount = query.split(/\s+/).length;

    if (wordCount < 5 && entityCount <= 1) return "simple";
    if (wordCount < 15 && entityCount <= 2) return "moderate";
    return "complex";
  }
}
