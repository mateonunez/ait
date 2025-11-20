import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { RerankingInput, RerankingOutput } from "../../types/stages";
import { recordSpan } from "../../telemetry/telemetry.middleware";
import { CollectionRerankService } from "../../services/ranking/collection-rerank.service";
import { RerankService } from "../../services/ranking/rerank.service";
import type { CollectionVendor } from "@/types";

export class RerankingStage implements IPipelineStage<RerankingInput, RerankingOutput> {
  readonly name = "reranking";

  private readonly rerankService: CollectionRerankService;

  constructor() {
    const reranker = new RerankService();
    this.rerankService = new CollectionRerankService(reranker);
  }

  async canExecute(input: RerankingInput): Promise<boolean> {
    return input.shouldUseFastPath !== true;
  }

  async execute(input: RerankingInput, context: PipelineContext): Promise<RerankingOutput> {
    const startTime = Date.now();

    const documentsToRerank = input.fusedDocuments.length > 0 ? input.fusedDocuments : input.documents;

    const weightedDocs = documentsToRerank.map((doc) => ({
      ...doc,
      collectionVendor: ((doc.metadata as Record<string, unknown>).collectionVendor ||
        (doc.metadata as Record<string, unknown>).__vendor ||
        "unknown") as CollectionVendor,
      collectionWeight: ((doc.metadata as Record<string, unknown>).collectionWeight as number) || 1.0,
      finalScore: ((doc.metadata as Record<string, unknown>).score as number) || 0,
    }));

    const reranked = await this.rerankService.rerankByCollection(weightedDocs, input.query, 100);

    const rerankedDocuments = reranked.map((wd) => ({
      pageContent: wd.pageContent,
      metadata: wd.metadata,
    }));

    if (context.traceContext) {
      recordSpan(
        this.name,
        "reranking",
        context.traceContext,
        {
          query: input.query.slice(0, 100),
          inputCount: documentsToRerank.length,
        },
        {
          outputCount: rerankedDocuments.length,
          duration: Date.now() - startTime,
        },
      );
    }

    return {
      ...input,
      rerankedDocuments,
      rerankMetadata: {
        strategy: "collection-rerank",
        inputCount: documentsToRerank.length,
        outputCount: rerankedDocuments.length,
      },
    };
  }
}
