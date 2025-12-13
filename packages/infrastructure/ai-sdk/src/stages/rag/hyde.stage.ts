import { getLogger } from "@ait/core";
import { type HyDEService, getHyDEService } from "../../services/generation/hyde.service";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { CollectionRoutingOutput, RetrievalInput } from "../../types/stages";

const logger = getLogger();

export class HyDEStage implements IPipelineStage<CollectionRoutingOutput, RetrievalInput> {
  readonly name = "hyde-generation";

  private readonly hydeService: HyDEService;

  constructor(hydeService?: HyDEService) {
    this.hydeService = hydeService || getHyDEService();
  }

  async execute(input: CollectionRoutingOutput, context: PipelineContext): Promise<RetrievalInput> {
    const startTime = Date.now();
    const endSpan = context.traceContext
      ? createSpanWithTiming(this.name, "rag", context.traceContext, {
          query: input.query.slice(0, 100),
        })
      : null;

    logger.debug("Generating HyDE document for query", { query: input.query });

    const hypotheticalDoc = await this.hydeService.generateHypotheticalDocument(input.query);

    const duration = Date.now() - startTime;
    if (endSpan) {
      endSpan({
        hyptheticalLength: hypotheticalDoc.length,
        duration,
      });
    }

    return {
      ...input,
      retrievalQuery: hypotheticalDoc,
    };
  }
}
