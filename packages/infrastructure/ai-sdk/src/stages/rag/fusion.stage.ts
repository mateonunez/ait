import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { FusionInput, FusionOutput } from "../../types/stages";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import { WeightedRankFusionService } from "../../services/ranking/weighted-rank-fusion.service";
import { DiversityService } from "../../services/filtering/diversity.service";

export class FusionStage implements IPipelineStage<FusionInput, FusionOutput> {
  readonly name = "fusion";

  private readonly fusionService: WeightedRankFusionService;
  private readonly diversityService: DiversityService;

  constructor() {
    this.fusionService = new WeightedRankFusionService();
    this.diversityService = new DiversityService();
  }

  async canExecute(input: FusionInput): Promise<boolean> {
    return input.shouldUseFastPath !== true;
  }

  async execute(input: FusionInput, context: PipelineContext): Promise<FusionOutput> {
    const endSpan = context.traceContext
      ? createSpanWithTiming(this.name, "fusion", context.traceContext, {
          inputCount: input.documents.length,
          collectionCount: input.routingResult.selectedCollections.length,
        })
      : null;

    const collectionResults = input.routingResult.selectedCollections.map((cw) => ({
      vendor: cw.vendor,
      documents: input.documents
        .filter((doc) => {
          const vendor =
            (doc.metadata as Record<string, unknown>).collectionVendor ||
            (doc.metadata as Record<string, unknown>).__vendor;
          return vendor === cw.vendor;
        })
        .map(
          (doc) => [doc, ((doc.metadata as Record<string, unknown>).score as number) || 1.0] as [typeof doc, number],
        ),
      collectionWeight: cw.weight,
    }));

    const fusedWeightedDocs = this.fusionService.fuseResults(collectionResults, input.documents.length);

    let fusedDocuments = fusedWeightedDocs.map((wd) => ({
      pageContent: wd.pageContent,
      metadata: wd.metadata,
    }));

    fusedDocuments = this.diversityService.applyMMR(fusedDocuments, input.documents.length);

    if (endSpan) {
      endSpan({
        outputCount: fusedDocuments.length,
        strategy: "weighted-rank-fusion",
      });
    }

    return {
      ...input,
      fusedDocuments,
      fusionMetadata: {
        strategy: "weighted-rank-fusion",
        originalCount: input.documents.length,
        fusedCount: fusedDocuments.length,
      },
    };
  }
}
