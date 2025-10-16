import dotenv from "dotenv";
import { Ollama, OllamaEmbeddings } from "@langchain/ollama";

// 1. Load environment variables
dotenv.config();

/**
 * Default model name, e.g., "qwen3:latest".
 */
export const DEFAULT_GENERATION_MODEL = process.env.GENERATION_MODEL || "qwen3:latest";

/**
 * Default model name, e.g., "qwen3-embedding:latest".
 */
export const DEFAULT_EMBEDDINGS_MODEL = process.env.EMBEDDINGS_MODEL || "qwen3-embedding:latest";

/**
 * Default vector size for embeddings.
 */
export const GENERATION_VECTOR_SIZE = Number(process.env.GENERATION_VECTOR_SIZE || "4096");

/**
 * Default base URL for the Ollama server.
 */
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

/**
 * Configuration interface for LangChain-related clients.
 */
export interface ILangChainConfig {
  /**
   * Default model name, e.g., "qwen3:latest".
   */
  model: string;

  /**
   * Expected size of embeddings vectors.
   */
  expectedVectorSize: number;

  /**
   * Whether to enable logging or not.
   */
  logger?: boolean;

  /**
   * Base URL for the Ollama server.
   */
  baseUrl?: string;
}

/**
 * Builds and returns a reusable LangChain client with various helpers.
 */
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

// Internal state for the singleton instance
let _instance: ReturnType<typeof buildLangChainClient> | null = null;

/**
 * Default config derived from environment or safe defaults.
 */
let _config: ILangChainConfig = {
  model: DEFAULT_GENERATION_MODEL,
  expectedVectorSize: GENERATION_VECTOR_SIZE,
  logger: true,
  baseUrl: OLLAMA_BASE_URL,
};

/**
 * Allows overriding default config, e.g., in tests or special environments.
 */
export function initLangChainClient(configOverrides: Partial<ILangChainConfig> = {}): void {
  _config = { ..._config, ...configOverrides };
}

/**
 * Returns the shared LangChain client, creating it if necessary.
 */
export function getLangChainClient() {
  if (!_instance) {
    _instance = buildLangChainClient(_config);
  }
  return _instance;
}

/**
 * Resets the singleton instance, e.g., for testing purposes.
 */
export function resetLangChainClientInstance() {
  _instance = null;
}
