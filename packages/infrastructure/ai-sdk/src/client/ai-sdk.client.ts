import { AItError, getLogger } from "@ait/core";
import { type LanguageModel, embed, generateObject, generateText, streamText } from "ai";
import { createOllama } from "ai-sdk-ollama";
import dotenv from "dotenv";
import type { ZodType } from "zod";
import {
  type EmbeddingModelName,
  type GenerationModelName,
  type ModelSpec,
  getEmbeddingModel,
  getGenerationModel,
  getModelSpec,
} from "../config/models.config";
import { type PresetName, getPreset, mergePresetWithOverrides } from "../config/presets.config";
import { getCircuitBreaker } from "../services/resilience/circuit-breaker.service";
import { TextGenerationService } from "../services/text-generation/text-generation.service";
import { initLangfuseProvider, resetLangfuseProvider } from "../telemetry/langfuse.provider";
import type { ClientConfig } from "../types/config";
import type { ModelGenerateOptions, ModelGenerateResult, ModelStreamOptions } from "../types/models";

import {
  type CompatibleEmbeddingModel,
  type CompatibleLanguageModel,
  attemptStructuredRepair,
  augmentPrompt,
  nextDelay,
  wait,
} from "../utils/generation.utils";

dotenv.config();

const logger = getLogger();

export const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const DEFAULT_STRUCTURED_MAX_RETRIES = 2;
const CIRCUIT_BREAKER_OPTIONS = {
  failureThreshold: 3,
  resetTimeout: 30000,
  timeout: 120000,
};

export type AItClientConfig = ClientConfig;

export interface LlmStructuredGenerationOptions<T> {
  prompt: string;
  schema: ZodType<T>;
  temperature?: number;
  jsonInstruction?: string;
  maxRetries?: number;
}

export class AItClient {
  private readonly _ollamaModel: CompatibleLanguageModel;
  private readonly _ollamaEmbeddingModel: CompatibleEmbeddingModel;
  private readonly _structuredModel: CompatibleLanguageModel;
  private readonly _circuitBreaker = getCircuitBreaker("llm-generation", CIRCUIT_BREAKER_OPTIONS);

  constructor(
    public readonly config: Required<AItClientConfig>,
    public readonly generationModelConfig: ModelSpec,
    public readonly embeddingModelConfig: ModelSpec,
  ) {
    const ollamaBaseURL = config.ollama.baseURL || DEFAULT_OLLAMA_BASE_URL;

    const ollama = createOllama({
      baseURL: ollamaBaseURL,
    });

    this._ollamaModel = ollama(String(generationModelConfig.name)) as unknown as CompatibleLanguageModel;
    this._ollamaEmbeddingModel = ollama.embedding(
      String(embeddingModelConfig.name),
    ) as unknown as CompatibleEmbeddingModel;
    this._structuredModel = this._ollamaModel;

    if (config.logger) {
      logger.info("[AItClient] Initialized", {
        generationModel: generationModelConfig.name,
        embeddingModel: embeddingModelConfig.name,
        baseURL: ollamaBaseURL,
      });
    }
  }

  public async generateText(options: ModelGenerateOptions): Promise<ModelGenerateResult> {
    return this._circuitBreaker.execute(async () => {
      const baseParams = {
        model: this._ollamaModel as LanguageModel,
        temperature: options.temperature ?? this.config.generation.temperature,
        topP: options.topP ?? this.config.generation.topP,
        topK: options.topK ?? this.config.generation.topK,
        tools: options.tools,
      };

      const generateOptions = options.messages?.length
        ? { ...baseParams, messages: options.messages }
        : { ...baseParams, prompt: options.prompt };

      const result = await generateText(generateOptions as any);

      return {
        text: result.text,
        toolCalls: result.toolCalls?.map((tc) => ({
          function: {
            name: tc.toolName,
            // @ts-expect-error - args property exists at runtime in AI SDK v5/6
            arguments: (tc.args ?? {}) as Record<string, unknown>,
          },
        })),
      };
    });
  }

  public async *streamText(options: ModelStreamOptions): AsyncGenerator<string> {
    const baseParams = {
      model: this._ollamaModel as LanguageModel,
      temperature: options.temperature ?? this.config.generation.temperature,
      topP: options.topP ?? this.config.generation.topP,
      topK: options.topK ?? this.config.generation.topK,
    };

    const streamOptions = options.messages?.length
      ? { ...baseParams, messages: options.messages }
      : { ...baseParams, prompt: options.prompt };

    const result = streamText(streamOptions as any);

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }

  public async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this._ollamaEmbeddingModel,
      value: text,
    });
    return embedding;
  }

  public async generateStructured<T>(options: LlmStructuredGenerationOptions<T>): Promise<T> {
    const prompt = augmentPrompt(options.prompt, options.jsonInstruction);
    const configuredRetries = this.config.textGeneration.retryConfig?.maxRetries ?? DEFAULT_STRUCTURED_MAX_RETRIES;
    const maxRetries = options.maxRetries ?? configuredRetries;
    const baseTemperature = options.temperature ?? this.config.generation.temperature;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { object } = await generateObject({
          model: this._structuredModel as LanguageModel,
          schema: options.schema,
          prompt,
          temperature: baseTemperature,
        });

        return object as T;
      } catch (error) {
        lastError = error;
        const isFinalAttempt = attempt >= maxRetries;

        logger.warn("Structured generation attempt failed", {
          attempt,
          maxRetries,
          error: error instanceof Error ? error.message : String(error),
        });

        if (isFinalAttempt) {
          break;
        }

        try {
          const repaired = await attemptStructuredRepair(
            this._structuredModel,
            prompt,
            options.schema,
            baseTemperature,
          );
          if (repaired.success) {
            return repaired.data as T;
          }
          lastError = repaired.error ?? lastError;
        } catch (repairError) {
          lastError = repairError;
        }

        await wait(nextDelay(attempt, this.config.textGeneration.retryConfig?.delayMs));
      }
    }

    throw new AItError(
      "STRUCTURED_FAILED",
      `Structured generation failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      undefined,
      lastError,
    );
  }
}

// Singleton Management
let _clientInstance: AItClient | null = null;
let _textGenerationServiceInstance: TextGenerationService | null = null;
let _config: Required<AItClientConfig> | null = null;

export interface InitOptions {
  preset?: PresetName;
  overrides?: Partial<ClientConfig>;
}

export function initAItClient(options: InitOptions | Partial<AItClientConfig> = {}): void {
  let finalConfig: Required<AItClientConfig>;

  if ("preset" in options && options.preset) {
    finalConfig = mergePresetWithOverrides(options.preset, options.overrides);
  } else {
    // Default initialization
    const presetConfig = getPreset("rag-optimized");
    const generationModelConfig = getGenerationModel();
    const embeddingModelConfig = getEmbeddingModel();

    finalConfig = {
      generation: {
        model: generationModelConfig.name as GenerationModelName,
        temperature: generationModelConfig.temperature || 0.7,
        topP: generationModelConfig.topP || 0.9,
        topK: generationModelConfig.topK,
        frequencyPenalty: generationModelConfig.frequencyPenalty,
        presencePenalty: generationModelConfig.presencePenalty,
        ...(options as Partial<ClientConfig>).generation,
      },
      embeddings: {
        model: embeddingModelConfig.name as EmbeddingModelName,
        vectorSize: embeddingModelConfig.vectorSize,
        ...(options as Partial<ClientConfig>).embeddings,
      },
      rag: {
        ...presetConfig.rag,
        ...(options as Partial<ClientConfig>).rag,
        collectionRouting: {
          ...presetConfig.rag.collectionRouting,
          ...((options as Partial<ClientConfig>).rag?.collectionRouting || {}),
        },
      },
      textGeneration: {
        multipleQueryPlannerConfig: {
          ...presetConfig.textGeneration.multipleQueryPlannerConfig,
          ...((options as Partial<ClientConfig>).textGeneration?.multipleQueryPlannerConfig || {}),
        },
        conversationConfig: {
          ...presetConfig.textGeneration.conversationConfig,
          ...((options as Partial<ClientConfig>).textGeneration?.conversationConfig || {}),
        },
        contextPreparationConfig: {
          ...presetConfig.textGeneration.contextPreparationConfig,
          ...((options as Partial<ClientConfig>).textGeneration?.contextPreparationConfig || {}),
        },
        toolExecutionConfig: {
          ...presetConfig.textGeneration.toolExecutionConfig,
          ...((options as Partial<ClientConfig>).textGeneration?.toolExecutionConfig || {}),
        },
        retryConfig: {
          ...presetConfig.textGeneration.retryConfig,
          ...((options as Partial<ClientConfig>).textGeneration?.retryConfig || {}),
        },
      },
      ollama: {
        baseURL: DEFAULT_OLLAMA_BASE_URL,
        ...(options as Partial<ClientConfig>).ollama,
      },
      telemetry: {
        enabled: false,
        publicKey: undefined,
        secretKey: undefined,
        baseURL: undefined,
        flushAt: 1,
        flushInterval: 1000,
        ...(options as Partial<ClientConfig>).telemetry,
      },
      logger: (options as Partial<ClientConfig>).logger ?? true,
    };
  }

  _config = finalConfig;

  resetLangfuseProvider();
  if (_config.telemetry.enabled) {
    initLangfuseProvider(_config.telemetry);
  }

  _clientInstance = null;
  _textGenerationServiceInstance = null;
}

export function getAItClient(): AItClient {
  if (!_clientInstance) {
    if (!_config) {
      initAItClient();
    }
    const config = _config!;

    const generationModelName = config.generation.model;
    const embeddingsModelName = config.embeddings.model;

    const generationModelConfig = generationModelName
      ? getModelSpec(generationModelName, "generation") || getGenerationModel()
      : getGenerationModel();
    const embeddingModelConfig = embeddingsModelName
      ? getModelSpec(embeddingsModelName, "embedding") || getEmbeddingModel()
      : getEmbeddingModel();

    _clientInstance = new AItClient(config, generationModelConfig, embeddingModelConfig);
  }
  return _clientInstance;
}

export function getTextGenerationService(): TextGenerationService {
  if (!_textGenerationServiceInstance) {
    if (!_config) {
      initAItClient();
    }
    const config = _config!;

    _textGenerationServiceInstance = new TextGenerationService({
      multipleQueryPlannerConfig: config.textGeneration.multipleQueryPlannerConfig,
      conversationConfig: config.textGeneration.conversationConfig,
      contextPreparationConfig: config.textGeneration.contextPreparationConfig,
      toolExecutionConfig: config.textGeneration.toolExecutionConfig,
      retryConfig: config.textGeneration.retryConfig,
    });
  }
  return _textGenerationServiceInstance;
}

export function resetAItClientInstance(): void {
  _clientInstance = null;
  _textGenerationServiceInstance = null;
}

export function getClientConfig(): Required<AItClientConfig> {
  if (!_config) {
    initAItClient();
  }
  return _config!;
}

export function getGenerationModelConfig(): ModelSpec {
  return getAItClient().generationModelConfig;
}

export function getEmbeddingModelConfig(): ModelSpec {
  return getAItClient().embeddingModelConfig;
}

export function modelSupportsTools(): boolean {
  return getGenerationModelConfig().supportsTools ?? true;
}

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
