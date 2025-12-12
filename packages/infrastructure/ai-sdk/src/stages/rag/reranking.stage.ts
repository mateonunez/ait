import type { CollectionVendor } from "@/types";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { CollectionRerankService } from "../../services/ranking/collection-rerank.service";
import { FastRerankService } from "../../services/ranking/fast-rerank.service";
import { RerankService } from "../../services/ranking/rerank.service";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { RerankingInput, RerankingOutput } from "../../types/stages";

export interface RerankingStageConfig {
  enableLLMReranking?: boolean;
  useCollectionSpecificPrompts?: boolean;
}

export class RerankingStage implements IPipelineStage<RerankingInput, RerankingOutput> {
  readonly name = "reranking";

  private readonly rerankService: CollectionRerankService;
  private readonly enableLLMReranking: boolean;

  constructor(config?: RerankingStageConfig) {
    this.enableLLMReranking = config?.enableLLMReranking ?? false;

    const reranker = this.enableLLMReranking ? new RerankService() : new FastRerankService();

    this.rerankService = new CollectionRerankService(reranker, {
      useCollectionSpecificPrompts: config?.useCollectionSpecificPrompts ?? true,
    });
  }

  async canExecute(input: RerankingInput): Promise<boolean> {
    return input.shouldUseFastPath !== true;
  }

  async execute(input: RerankingInput, context: PipelineContext): Promise<RerankingOutput> {
    const documentsToRerank = input.fusedDocuments.length > 0 ? input.fusedDocuments : input.documents;

    const endSpan = context.traceContext
      ? createSpanWithTiming(this.name, "reranking", context.traceContext, {
          query: input.query.slice(0, 100),
          inputCount: documentsToRerank.length,
          method: this.enableLLMReranking ? "llm" : "heuristic",
        })
      : null;

    const weightedDocs = documentsToRerank.map((doc) => ({
      ...doc,
      collectionVendor: ((doc.metadata as Record<string, unknown>).collectionVendor ||
        (doc.metadata as Record<string, unknown>).__vendor ||
        "unknown") as CollectionVendor,
      collectionWeight: ((doc.metadata as Record<string, unknown>).collectionWeight as number) || 1.0,
      finalScore: ((doc.metadata as Record<string, unknown>).score as number) || 0,
    }));

    // Extract target entity types from routing result for targeted filtering
    const targetEntityTypes = input.routingResult?.suggestedEntityTypes;

    const reranked = await this.rerankService.rerankByCollection(
      weightedDocs,
      input.query,
      100,
      context.traceContext,
      targetEntityTypes,
    );

    const rerankedDocuments = reranked.map((wd) => ({
      pageContent: wd.pageContent,
      metadata: wd.metadata,
    }));

    if (endSpan) {
      endSpan({
        outputCount: rerankedDocuments.length,
        strategy: this.enableLLMReranking ? "llm-collection-rerank" : "fast-heuristic-rerank",
      });
    }

    return {
      ...input,
      rerankedDocuments,
      rerankMetadata: {
        strategy: this.enableLLMReranking ? "llm-collection-rerank" : "fast-heuristic-rerank",
        inputCount: documentsToRerank.length,
        outputCount: rerankedDocuments.length,
      },
    };
  }
}
