/**
 * Ollama-specific type definitions
 * These types represent the Ollama API contract
 */

/**
 * Ollama tool definition
 */
export interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Ollama tool call result
 */
export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * Ollama message format
 */
export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
}

/**
 * Ollama generation request
 */
export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  tools?: OllamaTool[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

/**
 * Ollama chat request
 */
export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  tools?: OllamaTool[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

/**
 * Ollama embedding request
 */
export interface OllamaEmbedRequest {
  model: string;
  prompt: string;
}

/**
 * Ollama provider configuration
 */
export interface OllamaConfig {
  baseURL: string;
}

/**
 * Options for Ollama chat generation
 */
export interface OllamaChatGenerateOptions {
  prompt?: string;
  messages?: OllamaMessage[];
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: OllamaTool[];
}

/**
 * Result from Ollama generation
 */
export interface OllamaGenerateResult {
  text: string;
  toolCalls?: OllamaToolCall[];
}
