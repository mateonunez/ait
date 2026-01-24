import { getLogger } from "@ait/core";
import { rerank } from "../../../rag/rerank";
import { type RetrievedDocument, retrieve } from "../../../rag/retrieve";
import type { TypeFilter } from "../../../types/rag";
import type { TraceContext } from "../../../types/telemetry";
import { ragContextPrompt } from "../../prompts/rag-context.prompt";
import type { TextGenerationConfig } from "../../text-generation/text-generation.service";
import { getContextPreprocessorService } from "../context-preprocessor.service";
import { SmartContextManager } from "../smart/smart-context.manager";

const logger = getLogger();

export interface RAGRequest {
  prompt: string;
  typeFilter?: TypeFilter;
  allowedVendors?: Set<string>;
  traceContext?: TraceContext;
}

export interface RAGResult {
  context?: string;
  documents: RetrievedDocument[];
}

export interface IRAGManager {
  retrieveAndProcess(request: RAGRequest): Promise<RAGResult>;
}

export class RAGManager implements IRAGManager {
  private readonly _contextManager: SmartContextManager;
  private readonly _config: TextGenerationConfig;

  constructor(config: TextGenerationConfig = {}) {
    this._config = config;
    this._contextManager = new SmartContextManager({
      totalTokenLimit: config.contextConfig?.maxContextChars
        ? Math.floor(config.contextConfig.maxContextChars / 4)
        : undefined,
      ragTokenLimit: config.contextConfig?.maxContextChars
        ? Math.floor((config.contextConfig.maxContextChars / 4) * 0.4) // 40% of max context
        : 20000,
    });
  }

  public async retrieveAndProcess(request: RAGRequest): Promise<RAGResult> {
    const { prompt, typeFilter, allowedVendors, traceContext } = request;

    const retrieval = await retrieve({
      query: prompt,
      types: typeFilter?.types,
      limit: this._config.retrievalConfig?.limit ?? 20,
      scoreThreshold: this._config.retrievalConfig?.scoreThreshold ?? 0.4,
      filter: typeFilter?.timeRange
        ? {
            fromDate: typeFilter.timeRange.from,
            toDate: typeFilter.timeRange.to,
          }
        : undefined,
      traceContext,
      enableCache: true,
      allowedVendors,
    });

    if (retrieval.documents.length === 0) {
      return { documents: [] };
    }

    const ranked = rerank({
      query: prompt,
      documents: retrieval.documents,
      topK: this._config.retrievalConfig?.limit ?? 20,
    });

    // Pre-filter documents by temporal intent before sending to LLM
    const contextPreprocessor = getContextPreprocessorService();
    const preprocessed = contextPreprocessor.filter({
      documents: ranked.documents,
      query: prompt,
    });

    if (preprocessed.filtered > 0) {
      logger.info("[RAGManager] Documents preprocessed by temporal intent", {
        originalCount: ranked.documents.length,
        filteredCount: preprocessed.filtered,
        keptCount: preprocessed.kept,
        temporalIntent: preprocessed.temporalIntent,
      });
    }

    const context = await this._contextManager.assembleContext({
      systemInstructions: ragContextPrompt,
      retrievedDocs: preprocessed.documents.map((doc) => ({
        pageContent: doc.content,
        metadata: {
          id: doc.id,
          __type: "document",
          source: doc.source || (doc.metadata?.source as string),
          collection: doc.collection,
          ...doc.metadata,
        },
      })),
    });

    logger.info("[RAGManager] Context assembled", {
      ragContextLength: context?.length,
      documentCount: preprocessed.documents.length,
    });

    return {
      context,
      documents: preprocessed.documents,
    };
  }
}
