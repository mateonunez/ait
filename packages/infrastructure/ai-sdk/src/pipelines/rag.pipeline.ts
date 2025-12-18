import { randomUUID } from "node:crypto";
import { getLogger } from "@ait/core";
import { MultiCollectionProvider } from "../services/rag/multi-collection.provider";
import { PipelineBuilder } from "../services/rag/pipeline/pipeline.builder";
import type { PipelineResult } from "../services/rag/pipeline/pipeline.types";
import { MultiQueryRetrievalService } from "../services/retrieval/multi-query-retrieval.service";
import { QueryAnalysisStage } from "../stages/rag/query-analysis.stage";
import { RetrievalStage } from "../stages/rag/retrieval.stage";
import { createChildContext, createSpanWithTiming } from "../telemetry/telemetry.middleware";
import type { QueryAnalysisInput, RetrievalOutput } from "../types/stages";
import type { TraceContext } from "../types/telemetry";

const logger = getLogger();

/**
 * Configuration for the RAG pipeline.
 */
export interface RAGPipelineConfig {
  /** Model for generating embeddings */
  embeddingsModel?: string;
  /** Expected vector size for embeddings */
  vectorSize?: number;
  /** Maximum documents to retrieve */
  maxDocs?: number;
  /** Minimum relevance score (0-1, default: 0.2) */
  scoreThreshold?: number;
  /** Number of query variants to generate */
  queriesCount?: number;
  /** Concurrency for parallel searches */
  concurrency?: number;
  /** Context building configuration */
  contextBuilding?: {
    temporalWindowHours?: number;
    maxContextChars?: number;
  };
  /** Enable telemetry spans */
  enableTelemetry?: boolean;
}

/**
 * Options for executing the RAG pipeline.
 */
export interface RAGPipelineExecuteOptions {
  /**
   * Trace context for telemetry.
   */
  traceContext?: TraceContext;
  /**
   * Stages to skip.
   */
  skipStages?: string[];
  /**
   * Metadata to attach to telemetry spans.
   */
  metadata?: Record<string, unknown>;
}

export interface RAGPipeline {
  execute(input: QueryAnalysisInput, options?: RAGPipelineExecuteOptions): Promise<PipelineResult<RetrievalOutput>>;
}

export function createRAGPipeline(config: RAGPipelineConfig = {}): RAGPipeline {
  logger.info("Creating RAG pipeline", { config });

  const multiCollectionProvider = new MultiCollectionProvider({
    embeddingsModel: config.embeddingsModel,
    expectedVectorSize: config.vectorSize,
    enableTelemetry: config.enableTelemetry ?? true,
  });

  const multiQueryRetrieval = new MultiQueryRetrievalService({
    maxDocs: config.maxDocs ?? 100,
    concurrency: config.concurrency ?? 3,
    scoreThreshold: config.scoreThreshold ?? 0.2,
  });

  const orchestrator = PipelineBuilder.create<QueryAnalysisInput, RetrievalOutput>()
    .addStage(new QueryAnalysisStage())
    .addStage(
      new RetrievalStage(multiQueryRetrieval, multiCollectionProvider, {
        relevanceFloor: config.scoreThreshold ?? 0.3,
      }),
    )
    .withFailureMode("continue-on-error")
    .withTelemetry(config.enableTelemetry ?? true)
    .build();

  return {
    async execute(
      input: QueryAnalysisInput,
      options?: RAGPipelineExecuteOptions,
    ): Promise<PipelineResult<RetrievalOutput>> {
      const startTime = Date.now();
      const pipelineSpanId = randomUUID();

      const endPipelineSpan = options?.traceContext
        ? createSpanWithTiming("rag/pipeline", "rag", options.traceContext, {
            query: input.query?.slice(0, 100),
          })
        : null;

      let childContext: TraceContext | undefined;
      if (options?.traceContext && endPipelineSpan) {
        childContext = createChildContext(options.traceContext, pipelineSpanId);
      }

      const result = await orchestrator.execute(input, {
        ...options,
        traceContext: childContext || options?.traceContext,
      });

      const duration = Date.now() - startTime;

      if (endPipelineSpan) {
        endPipelineSpan({
          duration,
          stageCount: result.stageResults.length,
          success: result.success,
          documentCount: result.data?.documents?.length ?? 0,
        });
      }

      return result;
    },
  };
}
