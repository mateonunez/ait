import dotenv from "dotenv";
import { OllamaProvider } from "./ollama.provider";
import { getGenerationModel, getEmbeddingModel, type ModelSpec } from "../config/models.config";
import type { OllamaTool, OllamaToolCall } from "./ollama.provider";

dotenv.config();

export interface AItClientConfig {
  generation?: {
    model?: string;
    temperature?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  embeddings?: {
    model?: string;
    vectorSize?: number;
  };
  rag?: {
    collection?: string;
    strategy?: "single" | "multi-query";
    maxDocs?: number;
  };
  textGeneration?: {
    multipleQueryPlannerConfig?: {
      maxDocs?: number;
      queriesCount?: number;
      concurrency?: number;
    };
    conversationConfig?: {
      maxRecentMessages?: number;
      maxHistoryTokens?: number;
      enableSummarization?: boolean;
    };
    contextPreparationConfig?: {
      enableRAG?: boolean;
      cacheDurationMs?: number;
      topicSimilarityThreshold?: number;
    };
    toolExecutionConfig?: {
      maxRounds?: number;
      toolTimeoutMs?: number;
    };
    retryConfig?: {
      maxRetries?: number;
      delayMs?: number;
      backoffMultiplier?: number;
    };
  };
  ollama?: {
    baseURL?: string;
  };
  logger?: boolean;
}

export const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
export const DEFAULT_RAG_COLLECTION = process.env.DEFAULT_RAG_COLLECTION || "ait_embeddings_collection";

export interface AItClient {
  config: Required<AItClientConfig>;
  generationModel: {
    modelId: string;
    provider: string;
    doGenerate(options: {
      prompt: string;
      messages?: Array<{ role: string; content: string; tool_calls?: OllamaToolCall[] }>;
      temperature?: number;
      topP?: number;
      topK?: number;
      tools?: OllamaTool[];
    }): Promise<{
      text: string;
      toolCalls?: OllamaToolCall[];
    }>;
    doStream(options: {
      prompt: string;
      temperature?: number;
      topP?: number;
      topK?: number;
      tools?: OllamaTool[];
    }): AsyncGenerator<string>;
  };
  embeddingsModel: {
    modelId: string;
    provider: string;
    doEmbed(text: string): Promise<number[]>;
  };
  generationModelConfig: ModelSpec;
  embeddingModelConfig: ModelSpec;
}

let _clientInstance: AItClient | null = null;
let _textGenerationServiceInstance: any = null; // Will be typed as TextGenerationService to avoid circular dependency
let _config: Required<AItClientConfig>;

function buildAItClient(config: Required<AItClientConfig>) {
  const generationModelConfig = getGenerationModel();
  const embeddingModelConfig = getEmbeddingModel();

  const generationModelName = config.generation.model || generationModelConfig.name;
  const embeddingsModelName = config.embeddings.model || embeddingModelConfig.name;

  if (config.logger) {
    console.log(`[AItClient] Initializing with generation model: ${generationModelName}`);
    console.log(`[AItClient] Initializing with embeddings model: ${embeddingsModelName}`);
  }

  const ollama = new OllamaProvider({
    baseURL: config.ollama.baseURL || DEFAULT_OLLAMA_BASE_URL,
  });

  const generationModel = ollama.createTextModel(generationModelName);
  const embeddingsModel = ollama.createEmbeddingsModel(embeddingsModelName);

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
      model: generationModelConfig.name,
      temperature: generationModelConfig.temperature || 0.7,
      topP: generationModelConfig.topP || 0.9,
      topK: generationModelConfig.topK,
      frequencyPenalty: generationModelConfig.frequencyPenalty,
      presencePenalty: generationModelConfig.presencePenalty,
      ...configOverrides.generation,
    },
    embeddings: {
      model: embeddingModelConfig.name,
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
        cacheDurationMs: 5 * 60 * 1000, // 5 minutes
        topicSimilarityThreshold: 0.5,
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
