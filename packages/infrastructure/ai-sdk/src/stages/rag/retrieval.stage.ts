import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { RetrievalInput, RetrievalOutput } from "../../types/stages";
import type { IMultiQueryRetrievalService } from "../../services/retrieval/multi-query-retrieval.service";
import type { MultiCollectionProvider } from "../../services/rag/multi-collection.provider";
import { recordSpan } from "../../telemetry/telemetry.middleware";

export class RetrievalStage implements IPipelineStage<RetrievalInput, RetrievalOutput> {
  readonly name = "retrieval";

  private readonly multiQueryRetrieval: IMultiQueryRetrievalService;
  private readonly multiCollectionProvider: MultiCollectionProvider;

  constructor(multiQueryRetrieval: IMultiQueryRetrievalService, multiCollectionProvider: MultiCollectionProvider) {
    this.multiQueryRetrieval = multiQueryRetrieval;
    this.multiCollectionProvider = multiCollectionProvider;
  }

  async canExecute(input: RetrievalInput): Promise<boolean> {
    return input.shouldUseFastPath !== true;
  }

  async execute(input: RetrievalInput, context: PipelineContext): Promise<RetrievalOutput> {
    const startTime = Date.now();

    const documents = await this.multiQueryRetrieval.retrieveAcrossCollections(
      this.multiCollectionProvider,
      input.routingResult.selectedCollections,
      input.query,
      context.traceContext,
    );

    const totalDuration = Date.now() - startTime;

    const documentsPerCollection: Record<string, number> = {};
    for (const doc of documents) {
      const vendor = (doc.metadata.collectionVendor as string) || (doc.metadata.__vendor as string) || "unknown";
      documentsPerCollection[vendor] = (documentsPerCollection[vendor] || 0) + 1;
    }

    if (context.traceContext) {
      recordSpan(
        this.name,
        "retrieval",
        context.traceContext,
        {
          query: input.query.slice(0, 100),
          collections: input.routingResult.selectedCollections.map((c) => c.vendor),
        },
        {
          documentCount: documents.length,
          duration: totalDuration,
          collectionsQueried: input.routingResult.selectedCollections.length,
          documentsPerCollection,
        },
      );
    }

    return {
      ...input,
      documents,
      retrievalMetadata: {
        queriesExecuted: input.routingResult.selectedCollections.length,
        totalDuration,
        documentsPerCollection,
      },
    };
  }
}
