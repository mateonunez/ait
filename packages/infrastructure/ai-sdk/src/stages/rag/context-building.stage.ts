import { SmartContextManager } from "../../services/context/smart/smart-context.manager";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { ContextBuildingInput, ContextBuildingOutput } from "../../types/stages";

export class ContextBuildingStage implements IPipelineStage<ContextBuildingInput, ContextBuildingOutput> {
  readonly name = "context-building";

  private readonly contextManager: SmartContextManager;
  private readonly maxContextChars: number;

  constructor(config?: { temporalWindowHours?: number; maxContextChars?: number }) {
    this.contextManager = new SmartContextManager({
      totalTokenLimit: config?.maxContextChars ? Math.floor(config.maxContextChars / 4) : undefined,
    });
    this.maxContextChars = config?.maxContextChars ?? 100000;
  }

  async execute(input: ContextBuildingInput, context: PipelineContext): Promise<ContextBuildingOutput> {
    const documents = input.rerankedDocuments.length > 0 ? input.rerankedDocuments : input.documents;

    const endSpan = context.traceContext
      ? createSpanWithTiming(this.name, "context_preparation", context.traceContext, {
          documentCount: documents.length,
          isTemporalQuery: input.heuristics.isTemporalQuery,
        })
      : null;

    const builtContext = await this.contextManager.assembleContext({
      systemInstructions: "", // RAG pipeline usually doesn't strictly own the system prompt, or it's passed later.
      messages: input.messages || [],
      retrievedDocs: documents,
    });

    if (endSpan) {
      endSpan({
        contextLength: builtContext.length,
        usedTemporalCorrelation: false,
      });
    }

    return {
      ...input,
      context: builtContext,
      contextMetadata: {
        documentCount: documents.length,
        contextLength: builtContext.length,
        usedTemporalCorrelation: false,
      },
    };
  }
}
