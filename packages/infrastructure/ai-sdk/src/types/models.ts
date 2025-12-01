import type { OllamaMessage, OllamaTool, OllamaToolCall } from "./providers/ollama.types";

/**
 * Message format for model chat
 * Uses OllamaMessage as the base implementation
 */
export type ModelMessage = OllamaMessage;

/**
 * Options for model text generation
 */
export interface ModelGenerateOptions {
  prompt: string;
  messages?: ModelMessage[];
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: OllamaTool[];
}

/**
 * Options for model streaming generation
 */
export interface ModelStreamOptions {
  prompt: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: OllamaTool[];
}

/**
 * Result from model text generation
 */
export interface ModelGenerateResult {
  text: string;
  toolCalls?: OllamaToolCall[];
}

/**
 * Generation model interface
 * Provides text generation with optional tool support
 */
export interface GenerationModel {
  /** Model identifier */
  modelId: string;
  /** Provider name (e.g., "ollama") */
  provider: string;
  /** Generate text from prompt */
  doGenerate(options: ModelGenerateOptions): Promise<ModelGenerateResult>;
  /** Stream text generation */
  doStream(options: ModelStreamOptions): AsyncGenerator<string>;
}

/**
 * Embeddings model interface
 * Provides text embedding capabilities
 */
export interface EmbeddingsModel {
  /** Model identifier */
  modelId: string;
  /** Provider name (e.g., "ollama") */
  provider: string;
  /** Generate embeddings for text */
  doEmbed(text: string): Promise<number[]>;
}
