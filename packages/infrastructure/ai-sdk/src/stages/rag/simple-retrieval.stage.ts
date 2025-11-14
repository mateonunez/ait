import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { QueryAnalysisOutput, ContextBuildingInput } from "../../types/stages";
import type { MultiCollectionProvider } from "../../services/rag/multi-collection.provider";
import { recordSpan } from "../../telemetry/telemetry.middleware";
import { getCollectionByEntityType } from "../../config/collections.config";
import type { CollectionVendor } from "../../config/collections.config";
import type { EntityType } from "@ait/core";

export class SimpleRetrievalStage implements IPipelineStage<QueryAnalysisOutput, ContextBuildingInput> {
  readonly name = "simple-retrieval";

  private readonly multiCollectionProvider: MultiCollectionProvider;
  private readonly maxDocs: number;

  constructor(multiCollectionProvider: MultiCollectionProvider, maxDocs = 100) {
    this.multiCollectionProvider = multiCollectionProvider;
    this.maxDocs = maxDocs;
  }

  async canExecute(input: QueryAnalysisOutput): Promise<boolean> {
    return input.shouldUseFastPath === true;
  }

  async execute(input: QueryAnalysisOutput, context: PipelineContext): Promise<ContextBuildingInput> {
    const startTime = Date.now();

    const selectedVendor = this.selectCollectionVendor(input.intent.entityTypes || []);

    console.info("Simple retrieval using direct search", {
      vendor: selectedVendor,
      query: input.query.slice(0, 100),
      maxDocs: this.maxDocs,
    });

    const searchResult = await this.multiCollectionProvider.searchAcrossCollections(
      input.query,
      [{ vendor: selectedVendor, weight: 1.0, reasoning: "Fast path heuristic selection" }],
      this.maxDocs,
      context.traceContext,
    );

    const documents = searchResult.results.flatMap((result) => result.documents);

    const totalDuration = Date.now() - startTime;

    console.info("Simple retrieval completed", {
      vendor: selectedVendor,
      documentsFound: documents.length,
      duration: totalDuration,
    });

    if (context.traceContext) {
      recordSpan(
        this.name,
        "retrieval",
        context.traceContext,
        {
          query: input.query.slice(0, 100),
          vendor: selectedVendor,
          fastPath: true,
        },
        {
          documentCount: documents.length,
          duration: totalDuration,
        },
      );
    }

    return {
      ...input,
      routingResult: {
        strategy: "single-collection",
        selectedCollections: [
          {
            vendor: selectedVendor,
            weight: 1.0,
            reasoning: "Fast path heuristic selection",
          },
        ],
        confidence: 1.0,
        reasoning: "Simple query using heuristic-based collection selection",
      },
      documents,
      retrievalMetadata: {
        queriesExecuted: 1,
        totalDuration,
        documentsPerCollection: {
          [selectedVendor]: documents.length,
        },
      },
      rerankedDocuments: [],
      rerankMetadata: {
        strategy: "fast-path-skip",
        inputCount: 0,
        outputCount: 0,
      },
    };
  }

  private selectCollectionVendor(entityTypes: string[]): CollectionVendor {
    if (entityTypes.length === 0) {
      return "general";
    }

    const primaryEntityType = entityTypes[0] as EntityType;
    const collection = getCollectionByEntityType(primaryEntityType);

    if (!collection || !collection.enabled) {
      return "general";
    }

    return collection.vendor;
  }
}
