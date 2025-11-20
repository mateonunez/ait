import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { ContextBuildingInput, ContextBuildingOutput } from "../../types/stages";
import { recordSpan } from "../../telemetry/telemetry.middleware";
import { ContextBuilder } from "../../services/context/context.builder";
import { TemporalCorrelationService } from "../../services/filtering/temporal-correlation.service";

export class ContextBuildingStage implements IPipelineStage<ContextBuildingInput, ContextBuildingOutput> {
  readonly name = "context-building";

  private readonly contextBuilder: ContextBuilder;
  private readonly temporalCorrelation: TemporalCorrelationService;
  private readonly maxContextChars: number;

  constructor(config?: { temporalWindowHours?: number; maxContextChars?: number }) {
    this.contextBuilder = new ContextBuilder();
    this.temporalCorrelation = new TemporalCorrelationService(config?.temporalWindowHours ?? 3);
    this.maxContextChars = config?.maxContextChars ?? 18000;
  }

  async execute(input: ContextBuildingInput, context: PipelineContext): Promise<ContextBuildingOutput> {
    const startTime = Date.now();

    const documents = input.rerankedDocuments.length > 0 ? input.rerankedDocuments : input.documents;

    let builtContext = "";
    let usedTemporalCorrelation = false;

    if (input.heuristics.isTemporalQuery && documents.length > 0) {
      const entityTypes = new Set(documents.map((doc) => doc.metadata.__type).filter(Boolean));
      const hasTimestamps = documents.some(
        (doc) => doc.metadata.createdAt || doc.metadata.playedAt || doc.metadata.mergedAt || doc.metadata.pushedAt,
      );

      if (hasTimestamps && entityTypes.size > 1) {
        const clusters = this.temporalCorrelation.correlateByTimeWindow(documents, 3);
        if (clusters.length > 0) {
          builtContext = this.contextBuilder.buildTemporalContext(clusters);
          usedTemporalCorrelation = true;
        }
      }
    }

    if (!usedTemporalCorrelation) {
      builtContext = this.contextBuilder.buildStructuredContext(documents);
    }

    if (builtContext.length > this.maxContextChars) {
      const cut = builtContext.lastIndexOf("\n", this.maxContextChars);
      builtContext = builtContext.slice(0, cut > 0 ? cut : this.maxContextChars);
    }

    if (context.traceContext) {
      recordSpan(
        this.name,
        "context_preparation",
        context.traceContext,
        {
          documentCount: documents.length,
          usedTemporalCorrelation,
        },
        {
          contextLength: builtContext.length,
          duration: Date.now() - startTime,
        },
      );
    }

    return {
      ...input,
      context: builtContext,
      contextMetadata: {
        documentCount: documents.length,
        contextLength: builtContext.length,
        usedTemporalCorrelation,
      },
    };
  }
}
