import type { EmbeddingModelName, GenerationModelName } from "../config/models.config";
import type { TelemetryConfig } from "./telemetry";

export interface GenerationModelConfig {
  model?: GenerationModelName;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface EmbeddingModelConfig {
  model?: EmbeddingModelName;
  vectorSize?: number;
}

export interface RetrievalConfig {
  limit?: number;
  scoreThreshold?: number;
}

export interface ContextConfig {
  maxContextChars?: number;
}

export interface ToolConfig {
  maxRounds?: number;
}

export interface RetryConfig {
  maxRetries?: number;
  delayMs?: number;
}

export interface TextGenerationFeatureConfig {
  retrievalConfig?: RetrievalConfig;
  contextConfig?: ContextConfig;
  toolConfig?: ToolConfig;
  retryConfig?: RetryConfig;
}

export interface ClientConfig {
  generation?: GenerationModelConfig;
  embeddings?: EmbeddingModelConfig;
  textGeneration?: TextGenerationFeatureConfig;
  ollama?: { baseURL?: string };
  telemetry?: TelemetryConfig;
  logger?: boolean;
}
