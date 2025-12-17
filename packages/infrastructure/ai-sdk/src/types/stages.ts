import type { Suggestion } from "../services/generation/suggestion.service";
import type { QueryIntent } from "../services/routing/query-intent.service";
import type { ChatMessage } from "./chat";
import type { CollectionRouterResult } from "./collections";
import type { BaseMetadata, Document } from "./documents";
import type { TypeFilter } from "./rag";
import type { TraceContext } from "./telemetry";

export interface QueryAnalysisInput {
  query: string;
  messages?: ChatMessage[];
  traceContext?: TraceContext;
}

export interface QueryAnalysisOutput {
  query: string;
  intent: QueryIntent;
  messages?: ChatMessage[];
  needsRAG: boolean;
  traceContext?: TraceContext;
  routingResult?: CollectionRouterResult;
}

export interface CollectionRoutingInput extends QueryAnalysisOutput {}

export interface CollectionRoutingOutput extends QueryAnalysisOutput {
  routingResult: CollectionRouterResult;
}

export interface RetrievalInput extends CollectionRoutingOutput {
  retrievalQuery?: string;
  /** Optional type filter for the retrieval query, computed by QueryAnalysisStage */
  typeFilter?: TypeFilter;
}

export interface RetrievalOutput extends CollectionRoutingOutput {
  documents: Document<BaseMetadata>[];

  retrievalMetadata: {
    queriesExecuted: number;
    totalDuration: number;
    documentsPerCollection: Record<string, number>;
    fromCache?: boolean;
  };
}

export interface FusionInput extends RetrievalOutput {}

export interface FusionOutput extends RetrievalOutput {
  fusedDocuments: Document<BaseMetadata>[];
  fusionMetadata: {
    strategy: string;
    originalCount: number;
    fusedCount: number;
  };
}

export interface RerankingInput extends FusionOutput {}

export interface RerankingOutput extends FusionInput {
  rerankedDocuments: Document<BaseMetadata>[];
  rerankMetadata: {
    strategy: string;
    inputCount: number;
    outputCount: number;
  };
}

export interface ContextBuildingInput extends RetrievalOutput {
  rerankedDocuments?: Document<BaseMetadata>[];
  rerankMetadata?: {
    strategy: string;
    inputCount: number;
    outputCount: number;
  };
}

export interface ContextBuildingOutput extends ContextBuildingInput {
  context: string;
  contextMetadata: {
    documentCount: number;
    contextLength: number;
    usedTemporalCorrelation: boolean;
  };
}

export interface ConversationProcessingInput {
  messages: ChatMessage[];
  currentPrompt: string;
  traceContext?: TraceContext;
}

export interface ConversationProcessingOutput extends ConversationProcessingInput {
  recentMessages: ChatMessage[];
  summary?: string;
  estimatedTokens: number;
}

export interface ContextPreparationInput extends ConversationProcessingOutput {
  enableRAG: boolean;
  ragContext?: {
    context: string;
    documents: Document<BaseMetadata>[];
    timestamp: number;
    query: string;
    fallbackUsed: boolean;
    fallbackReason?: string;
  };
}

export interface ContextPreparationOutput extends ContextPreparationInput {
  ragContext?: {
    context: string;
    documents: Document<BaseMetadata>[];
    timestamp: number;
    query: string;
    fallbackUsed: boolean;
    fallbackReason?: string;
  };
}

export interface ToolExecutionInput extends ContextPreparationOutput {
  tools?: Record<string, unknown>;
  maxRounds: number;
  systemMessage: string;
}

export interface ToolExecutionOutput extends ContextPreparationOutput {
  finalPrompt: string;
  toolCalls: unknown[];
  toolResults: unknown[];
  hasToolCalls: boolean;
  accumulatedMessages?: ChatMessage[];
  finalTextResponse?: string;
}

export interface TextGenerationInput extends ToolExecutionOutput {
  temperature: number;
  topP: number;
  topK: number;
}

export interface TextGenerationOutput extends ToolExecutionOutput {
  textStream: AsyncGenerator<string>;
}

export interface MetadataExtractionInput {
  fullResponse: string;
  prompt: string;
  messages: ChatMessage[];
  enableMetadata: boolean;
}

export interface MetadataExtractionOutput extends MetadataExtractionInput {
  suggestions: Suggestion[];
}
