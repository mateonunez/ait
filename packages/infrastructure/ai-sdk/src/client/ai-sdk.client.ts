import dotenv from "dotenv";
import { OllamaProvider } from "./ollama.provider";
import { getGenerationModel, getEmbeddingModel, type ModelSpec } from "../config/models.config";

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
    doGenerate(options: { prompt: string; temperature?: number; topP?: number; topK?: number }): Promise<{
      text: string;
    }>;
    doStream(options: { prompt: string; temperature?: number; topP?: number; topK?: number }): AsyncGenerator<string>;
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
    ollama: {
      baseURL: DEFAULT_OLLAMA_BASE_URL,
      ...configOverrides.ollama,
    },
    logger: configOverrides.logger ?? true,
  };

  _clientInstance = null;
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

export function resetAItClientInstance() {
  _clientInstance = null;
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
