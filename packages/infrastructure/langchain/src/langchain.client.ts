import dotenv from "dotenv";
import { Ollama, OllamaEmbeddings, type OllamaInput } from "@langchain/ollama";
import { getGenerationModel, getEmbeddingModel } from "./models.config";

dotenv.config();

const generationModelConfig = getGenerationModel();
const embeddingModelConfig = getEmbeddingModel();

export const DEFAULT_GENERATION_MODEL = generationModelConfig.name;
export const DEFAULT_EMBEDDINGS_MODEL = embeddingModelConfig.name;
export const GENERATION_VECTOR_SIZE = generationModelConfig.vectorSize;
export const EMBEDDINGS_VECTOR_SIZE = embeddingModelConfig.vectorSize;
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export interface ILangChainConfig extends OllamaInput {
  model: string;
  expectedVectorSize: number;
  logger?: boolean;
  baseUrl?: string;
}

function buildLangChainClient(config: ILangChainConfig) {
  function createEmbeddings(modelOverride?: string): OllamaEmbeddings {
    const modelToUse = modelOverride || config.model;
    if (config.logger) {
      console.log(`[LangChainClient] Creating embeddings with model: ${modelToUse}`);
    }
    return new OllamaEmbeddings({ model: modelToUse, baseUrl: config.baseUrl ?? OLLAMA_BASE_URL });
  }

  function createLLM(modelOverride?: string, temperature = 0.7): Ollama {
    const modelToUse = modelOverride || config.model;
    if (config.logger) {
      console.log(`[LangChainClient] Creating LLM with model: ${modelToUse}`);
    }
    return new Ollama({
      model: modelToUse,
      baseUrl: config.baseUrl ?? OLLAMA_BASE_URL,
      temperature,
    });
  }

  return {
    config,
    createEmbeddings,
    createLLM,
  };
}

let _instance: ReturnType<typeof buildLangChainClient> | null = null;

let _config: ILangChainConfig = {
  model: DEFAULT_GENERATION_MODEL,
  expectedVectorSize: GENERATION_VECTOR_SIZE,
  logger: true,
  baseUrl: OLLAMA_BASE_URL,
};

export function initLangChainClient(configOverrides: Partial<ILangChainConfig> = {}): void {
  _config = { ..._config, ...configOverrides };
}

export function getLangChainClient() {
  if (!_instance) {
    _instance = buildLangChainClient(_config);
  }
  return _instance;
}

export function resetLangChainClientInstance() {
  _instance = null;
}
