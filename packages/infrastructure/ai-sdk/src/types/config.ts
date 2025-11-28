import type { ConversationConfig, ContextPreparationConfig, ToolExecutionConfig, RetryConfig } from "./text-generation";
import type { MultiQueryConfig, CollectionRoutingConfig, CollectionDiversityConfig } from "./rag";
import type { GenerationModelName, EmbeddingModelName } from "../config/models.config";
import type { TelemetryConfig } from "./telemetry";

/**
 * Configuration for generation model parameters
 */
export interface GenerationModelConfig {
  /** Model name/identifier */
  model?: GenerationModelName;
  /** Sampling temperature (0-2, default: 0.7) */
  temperature?: number;
  /** Nucleus sampling top-p (0-1, default: 0.9) */
  topP?: number;
  /** Top-k sampling (default: 40) */
  topK?: number;
  /** Frequency penalty (0-2, default: undefined) */
  frequencyPenalty?: number;
  /** Presence penalty (0-2, default: undefined) */
  presencePenalty?: number;
}

/**
 * Configuration for embedding model parameters
 */
export interface EmbeddingModelConfig {
  /** Model name/identifier */
  model?: EmbeddingModelName;
  /** Vector dimension size */
  vectorSize?: number;
}

/**
 * Configuration for RAG (Retrieval Augmented Generation)
 */
export interface RAGConfig {
  /** Retrieval strategy */
  strategy?: "single" | "multi-query" | "multi-collection";
  /** Maximum documents to retrieve */
  maxDocs?: number;
  /** Collection routing configuration */
  collectionRouting?: CollectionRoutingConfig;
  /** Collection diversity configuration */
  collectionDiversity?: CollectionDiversityConfig;
}

/**
 * Configuration for Ollama provider in client config
 */
export interface OllamaClientConfig {
  /** Base URL for Ollama API */
  baseURL?: string;
}

/**
 * Configuration for text generation features
 */
export interface TextGenerationFeatureConfig {
  /** Multi-query planner configuration */
  multipleQueryPlannerConfig?: Pick<MultiQueryConfig, "maxDocs" | "concurrency"> & {
    queriesCount?: number;
  };
  /** Conversation management configuration */
  conversationConfig?: ConversationConfig;
  /** Context preparation configuration */
  contextPreparationConfig?: ContextPreparationConfig;
  /** Tool execution configuration */
  toolExecutionConfig?: ToolExecutionConfig;
  /** Retry configuration */
  retryConfig?: RetryConfig;
}

/**
 * Main client configuration interface
 */
export interface ClientConfig {
  /** Generation model configuration */
  generation?: GenerationModelConfig;
  /** Embeddings model configuration */
  embeddings?: EmbeddingModelConfig;
  /** RAG configuration */
  rag?: RAGConfig;
  /** Text generation feature configuration */
  textGeneration?: TextGenerationFeatureConfig;
  /** Ollama provider configuration */
  ollama?: OllamaClientConfig;
  /** Telemetry configuration */
  telemetry?: TelemetryConfig;
  /** Enable logging */
  logger?: boolean;
}
