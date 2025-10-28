import dotenv from "dotenv";
import { OllamaProvider } from "./ollama.provider";
import {
  getGenerationModel,
  getEmbeddingModel,
  getModelSpec,
  type ModelSpec,
  type GenerationModelName,
  type EmbeddingModelName,
} from "../config/models.config";
import type { ClientConfig } from "../types/config";
import type { GenerationModel, EmbeddingsModel } from "../types/models";

dotenv.config();

export type AItClientConfig = ClientConfig;

export const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
export const DEFAULT_RAG_COLLECTION = process.env.DEFAULT_RAG_COLLECTION || "ait_embeddings_collection";

/**
 * AI Client interface
 * Provides access to generation and embedding models with configuration
 */
export interface AItClient {
  /** Client configuration */
  config: Required<AItClientConfig>;
  /** Generation model instance */
  generationModel: GenerationModel;
  /** Embeddings model instance */
  embeddingsModel: EmbeddingsModel;
  /** Generation model configuration */
  generationModelConfig: ModelSpec;
  /** Embedding model configuration */
  embeddingModelConfig: ModelSpec;
}

let _clientInstance: AItClient | null = null;
let _textGenerationServiceInstance: any = null; // Will be typed as TextGenerationService to avoid circular dependency
let _config: Required<AItClientConfig>;

function buildAItClient(config: Required<AItClientConfig>) {
  // Use the model from config, not from environment
  const generationModelName = config.generation.model;
  const embeddingsModelName = config.embeddings.model;

  // Get the model specs based on the configured model names
  const generationModelConfig = generationModelName
    ? getModelSpec(generationModelName, "generation") || getGenerationModel()
    : getGenerationModel();
  const embeddingModelConfig = embeddingsModelName
    ? getModelSpec(embeddingsModelName, "embedding") || getEmbeddingModel()
    : getEmbeddingModel();

  if (config.logger) {
    console.log(`[AItClient] Initializing with generation model: ${generationModelName}`);
    console.log(`[AItClient] Initializing with embeddings model: ${embeddingsModelName}`);
  }

  const ollama = new OllamaProvider({
    baseURL: config.ollama.baseURL || DEFAULT_OLLAMA_BASE_URL,
  });

  const generationModel = ollama.createTextModel(String(generationModelName));
  const embeddingsModel = ollama.createEmbeddingsModel(String(embeddingsModelName));

  return {
    config,
    generationModel,
    embeddingsModel,
    generationModelConfig,
    embeddingModelConfig,
  };
}

export function initAItClient(configOverrides: Partial<AItClientConfig> = {}): void {
  const generationModelConfig = getGenerationModel();
  const embeddingModelConfig = getEmbeddingModel();

  _config = {
    generation: {
      model: generationModelConfig.name as GenerationModelName,
      temperature: generationModelConfig.temperature || 0.7,
      topP: generationModelConfig.topP || 0.9,
      topK: generationModelConfig.topK,
      frequencyPenalty: generationModelConfig.frequencyPenalty,
      presencePenalty: generationModelConfig.presencePenalty,
      ...configOverrides.generation,
    },
    embeddings: {
      model: embeddingModelConfig.name as EmbeddingModelName,
      vectorSize: embeddingModelConfig.vectorSize,
      ...configOverrides.embeddings,
    },
    rag: {
      collection: DEFAULT_RAG_COLLECTION,
      strategy: "multi-query",
      maxDocs: 100,
      ...configOverrides.rag,
    },
    textGeneration: {
      multipleQueryPlannerConfig: {
        maxDocs: 100,
        queriesCount: 12,
        concurrency: 4,
        ...configOverrides.textGeneration?.multipleQueryPlannerConfig,
      },
      conversationConfig: {
        maxRecentMessages: 10,
        maxHistoryTokens: 4000,
        enableSummarization: false,
        ...configOverrides.textGeneration?.conversationConfig,
      },
      contextPreparationConfig: {
        enableRAG: true,
        cacheDurationMs: 0, // Disable caching
        topicSimilarityThreshold: 0.95,
        ...configOverrides.textGeneration?.contextPreparationConfig,
      },
      toolExecutionConfig: {
        maxRounds: 2,
        toolTimeoutMs: 30000,
        ...configOverrides.textGeneration?.toolExecutionConfig,
      },
      retryConfig: {
        maxRetries: 3,
        delayMs: 1000,
        backoffMultiplier: 2,
        ...configOverrides.textGeneration?.retryConfig,
      },
    },
    ollama: {
      baseURL: DEFAULT_OLLAMA_BASE_URL,
      ...configOverrides.ollama,
    },
    logger: configOverrides.logger ?? true,
  };

  _clientInstance = null;
  _textGenerationServiceInstance = null;
}

export function getAItClient(): AItClient {
  if (!_clientInstance) {
    if (!_config) {
      initAItClient();
    }
    _clientInstance = buildAItClient(_config);
  }
  return _clientInstance;
}

export function getTextGenerationService(): any {
  if (!_textGenerationServiceInstance) {
    // Lazy import to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextGenerationService } = require("../services/text-generation/text-generation.service");

    if (!_config) {
      initAItClient();
    }

    _textGenerationServiceInstance = new TextGenerationService({
      collectionName: _config.rag.collection,
      multipleQueryPlannerConfig: _config.textGeneration.multipleQueryPlannerConfig,
      conversationConfig: _config.textGeneration.conversationConfig,
      contextPreparationConfig: _config.textGeneration.contextPreparationConfig,
      toolExecutionConfig: _config.textGeneration.toolExecutionConfig,
      retryConfig: _config.textGeneration.retryConfig,
    });
  }
  return _textGenerationServiceInstance;
}

export function resetAItClientInstance() {
  _clientInstance = null;
  _textGenerationServiceInstance = null;
}

export function getClientConfig(): Required<AItClientConfig> {
  return _config;
}

export function getGenerationModelConfig(): ModelSpec {
  return getAItClient().generationModelConfig;
}

export function getEmbeddingModelConfig(): ModelSpec {
  return getAItClient().embeddingModelConfig;
}

/**
 * Check if the current generation model supports tool/function calling
 * @returns true if the model supports tools, false otherwise
 */
export function modelSupportsTools(): boolean {
  const config = getGenerationModelConfig();
  return config.supportsTools ?? true; // Default to true for backwards compatibility
}

/**
 * Get model capabilities for validation
 * @returns Object with model capability flags
 */
export function getModelCapabilities(): {
  supportsTools: boolean;
  contextWindow?: number;
  vectorSize: number;
} {
  const config = getGenerationModelConfig();
  return {
    supportsTools: config.supportsTools ?? true,
    contextWindow: config.contextWindow,
    vectorSize: config.vectorSize,
  };
}
