import dotenv from "dotenv";
import { AItError, getLogger } from "@ait/core";
import { createOllama } from "ollama-ai-provider-v2";
import { generateObject, generateText } from "ai";
import type { ZodType } from "zod";
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
import type {
  GenerationModel,
  EmbeddingsModel,
  ModelGenerateOptions,
  ModelStreamOptions,
  ModelGenerateResult,
} from "../types/models";
import type { OllamaTool } from "../types/providers/ollama.types";
import { initLangfuseProvider, resetLangfuseProvider } from "../telemetry/langfuse.provider";

dotenv.config();

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AItClientConfig = ClientConfig;

/**
 * Options for generating free-form text
 */
export interface LlmGenerateTextOptions {
  prompt: string;
  messages?: ModelGenerateOptions["messages"];
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: OllamaTool[];
}

/**
 * Options for streaming text generation
 */
export interface LlmStreamOptions {
  prompt: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: OllamaTool[];
}

/**
 * Options for structured JSON generation with schema validation
 */
export interface LlmStructuredGenerationOptions<T> {
  prompt: string;
  schema: ZodType<T>;
  temperature?: number;
  jsonInstruction?: string;
  maxRetries?: number;
}

/**
 * Main AI Client interface
 * Provides unified access to generation models, embeddings, and helper methods
 */
export interface AItClient {
  // Configuration
  /** Client configuration */
  config: Required<AItClientConfig>;

  // Model instances
  /** Generation model instance */
  generationModel: GenerationModel;
  /** Embeddings model instance */
  embeddingsModel: EmbeddingsModel;

  // Model configuration
  /** Generation model configuration */
  generationModelConfig: ModelSpec;
  /** Embedding model configuration */
  embeddingModelConfig: ModelSpec;

  // Generation methods
  /**
   * Generate free-form text using the configured model
   * Uses the underlying Ollama provider for direct generation
   */
  generateText(options: LlmGenerateTextOptions): Promise<ModelGenerateResult>;

  /**
   * Stream text using the configured model
   * Returns an async generator for real-time token streaming
   */
  streamText(options: LlmStreamOptions): AsyncGenerator<string>;

  /**
   * Generate structured JSON adhering to the provided Zod schema
   * Includes automatic retry logic and repair mechanisms for malformed JSON
   */
  generateStructured<T>(options: LlmStructuredGenerationOptions<T>): Promise<T>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
export const DEFAULT_RAG_COLLECTION = process.env.DEFAULT_RAG_COLLECTION || "ait_embeddings_collection";

const DEFAULT_JSON_INSTRUCTION =
  "IMPORTANT: Respond ONLY with valid JSON that matches the expected schema. Do not include explanations.";
const DEFAULT_STRUCTURED_MAX_RETRIES = 2;

type StructuredModel = ReturnType<ReturnType<typeof createOllama>>;

// ============================================================================
// INTERNAL STATE
// ============================================================================

let _clientInstance: AItClient | null = null;
let _textGenerationServiceInstance: any = null; // TextGenerationService - typed as any to avoid circular dependency
let _config: Required<AItClientConfig>;

// ============================================================================
// INTERNAL HELPERS - Structured Generation Utilities
// ============================================================================

/**
 * Augments a prompt with JSON instruction if not already present
 */
function augmentPrompt(prompt: string, customInstruction?: string): string {
  if (prompt.includes(DEFAULT_JSON_INSTRUCTION)) {
    return prompt;
  }

  if (customInstruction && prompt.includes(customInstruction)) {
    return prompt;
  }

  return [prompt.trim(), customInstruction ?? DEFAULT_JSON_INSTRUCTION].join("\n\n");
}

/**
 * Attempts to repair malformed JSON responses by extracting and validating JSON
 */
async function attemptStructuredRepair<T>(
  model: StructuredModel,
  prompt: string,
  schema: ZodType<T>,
  temperature?: number,
): Promise<{ success: boolean; data?: T; error?: unknown }> {
  try {
    const { text } = await generateText({
      model,
      prompt,
      temperature,
    });

    const jsonPayload = extractJson(text);
    if (!jsonPayload) {
      throw new AItError("PARSE_ERROR", "No JSON object found in repair response");
    }

    const parsed = JSON.parse(jsonPayload);
    const validation = schema.safeParse(parsed);
    if (!validation.success) {
      throw validation.error;
    }

    return { success: true, data: validation.data };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Extracts the first JSON object from text (handles markdown code blocks, etc.)
 */
function extractJson(text: string): string | null {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = text.slice(firstBrace, lastBrace + 1);
  return candidate.trim().length ? candidate : null;
}

/**
 * Calculates exponential backoff delay for retries
 */
function nextDelay(attempt: number, baseDelay?: number): number {
  const delay = baseDelay ?? 500;
  return delay * Math.max(1, attempt + 1);
}

/**
 * Async wait utility
 */
async function wait(ms?: number): Promise<void> {
  if (!ms || ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// CLIENT BUILDER
// ============================================================================

/**
 * Builds and initializes the AI client with all necessary models and methods
 */
function buildAItClient(config: Required<AItClientConfig>): AItClient {
  // Model configuration
  const generationModelName = config.generation.model;
  const embeddingsModelName = config.embeddings.model;

  const generationModelConfig = generationModelName
    ? getModelSpec(generationModelName, "generation") || getGenerationModel()
    : getGenerationModel();
  const embeddingModelConfig = embeddingsModelName
    ? getModelSpec(embeddingsModelName, "embedding") || getEmbeddingModel()
    : getEmbeddingModel();

  if (config.logger) {
    const logger = getLogger();
    logger.info(`[AItClient] Initializing with generation model: ${generationModelName}`);
    logger.info(`[AItClient] Initializing with embeddings model: ${embeddingsModelName}`);
  }

  // Initialize Ollama providers
  const ollama = new OllamaProvider({
    baseURL: config.ollama.baseURL || DEFAULT_OLLAMA_BASE_URL,
  });

  const generationModel = ollama.createTextModel(String(generationModelName));
  const embeddingsModel = ollama.createEmbeddingsModel(String(embeddingsModelName));

  // Initialize structured generation provider (ai SDK)
  const rawBaseURL = config.ollama.baseURL || DEFAULT_OLLAMA_BASE_URL;
  const apiBaseURL = rawBaseURL.endsWith("/api") ? rawBaseURL : `${rawBaseURL}/api`;
  const structuredProvider = createOllama({ baseURL: apiBaseURL });
  const structuredModel = structuredProvider(String(generationModelName));

  // Build client instance with all methods
  const clientInstance: AItClient = {
    config,
    generationModel,
    embeddingsModel,
    generationModelConfig,
    embeddingModelConfig,

    // Generate free-form text
    async generateText(options: LlmGenerateTextOptions): Promise<ModelGenerateResult> {
      const generateOptions: ModelGenerateOptions = {
        prompt: options.prompt,
        messages: options.messages,
        temperature: options.temperature ?? config.generation.temperature,
        topP: options.topP ?? config.generation.topP,
        topK: options.topK ?? config.generation.topK,
        tools: options.tools,
      };

      return generationModel.doGenerate(generateOptions);
    },

    // Stream text generation
    async *streamText(options: LlmStreamOptions): AsyncGenerator<string> {
      const streamOptions: ModelStreamOptions = {
        prompt: options.prompt,
        temperature: options.temperature ?? config.generation.temperature,
        topP: options.topP ?? config.generation.topP,
        topK: options.topK ?? config.generation.topK,
        tools: options.tools,
      };

      const stream = generationModel.doStream(streamOptions);
      for await (const chunk of stream) {
        yield chunk;
      }
    },

    // Generate structured JSON with retry and repair
    async generateStructured<T>(options: LlmStructuredGenerationOptions<T>): Promise<T> {
      const prompt = augmentPrompt(options.prompt, options.jsonInstruction);
      const configuredRetries = config.textGeneration.retryConfig?.maxRetries ?? DEFAULT_STRUCTURED_MAX_RETRIES;
      const maxRetries = options.maxRetries ?? configuredRetries;
      const baseTemperature = options.temperature ?? config.generation.temperature;

      let lastError: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const { object } = await generateObject({
            model: structuredModel,
            schema: options.schema,
            prompt,
            temperature: baseTemperature,
            mode: "json",
          });

          return object as T;
        } catch (error) {
          lastError = error;
          const isFinalAttempt = attempt >= maxRetries;

          getLogger().warn("Structured generation attempt failed", {
            attempt,
            maxRetries,
            error: error instanceof Error ? error.message : String(error),
          });

          if (isFinalAttempt) {
            break;
          }

          // Attempt repair before retrying
          try {
            const repaired = await attemptStructuredRepair(structuredModel, prompt, options.schema, baseTemperature);
            if (repaired.success) {
              return repaired.data as T;
            }
            lastError = repaired.error ?? lastError;
          } catch (repairError) {
            lastError = repairError;
          }

          await wait(nextDelay(attempt, config.textGeneration.retryConfig?.delayMs));
        }
      }

      throw new AItError(
        "STRUCTURED_FAILED",
        `Structured generation failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
        undefined,
        lastError,
      );
    },
  };

  return clientInstance;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize the AI client with optional configuration overrides
 * Must be called before using getAItClient()
 */
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
        cacheDurationMs: 0, // Disable caching by default
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
    telemetry: {
      enabled: false,
      publicKey: undefined,
      secretKey: undefined,
      baseURL: undefined,
      flushAt: 1,
      flushInterval: 1000,
      ...configOverrides.telemetry,
    },
    logger: configOverrides.logger ?? true,
  };

  resetLangfuseProvider();
  if (_config.telemetry.enabled) {
    initLangfuseProvider(_config.telemetry);
  }

  _clientInstance = null;
  _textGenerationServiceInstance = null;
}

/**
 * Get the singleton AI client instance
 * Automatically initializes with defaults if not already initialized
 */
export function getAItClient(): AItClient {
  if (!_clientInstance) {
    if (!_config) {
      initAItClient();
    }
    _clientInstance = buildAItClient(_config);
  }
  return _clientInstance;
}

/**
 * Get the singleton text generation service instance
 * Lazy-loaded to avoid circular dependencies
 */
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

/**
 * Reset the client instance (useful for testing or reconfiguration)
 */
export function resetAItClientInstance() {
  _clientInstance = null;
  _textGenerationServiceInstance = null;
}

/**
 * Get the current client configuration
 */
export function getClientConfig(): Required<AItClientConfig> {
  return _config;
}

/**
 * Get the generation model configuration
 */
export function getGenerationModelConfig(): ModelSpec {
  return getAItClient().generationModelConfig;
}

/**
 * Get the embedding model configuration
 */
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
