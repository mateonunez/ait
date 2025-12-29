import { getLogger } from "@ait/core";
import { type EmbeddingModel, embed } from "ai";
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
import { generateObject as generateStructuredObject } from "../generation/object";
import { stream } from "../generation/stream";
import { generate } from "../generation/text";
import { TextGenerationService } from "../services/text-generation/text-generation.service";
import { initLangfuseProvider, resetLangfuseProvider } from "../telemetry/langfuse.provider";
import type { ClientConfig } from "../types/config";
import type { ModelGenerateOptions, ModelGenerateResult, ModelStreamOptions, ToolCall } from "../types/models";
import type { CompatibleEmbeddingModel, CompatibleLanguageModel } from "../utils/generation.utils";

dotenv.config();

const logger = getLogger();

export const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

export type AItClientConfig = ClientConfig;

export interface LlmStructuredGenerationOptions<T> {
  prompt: string;
  schema: ZodType<T>;
  temperature?: number;
  jsonInstruction?: string;
  maxRetries?: number;
}

export class AItClient {
  public readonly model: CompatibleLanguageModel;
  public readonly embeddingModel: CompatibleEmbeddingModel;

  constructor(
    public readonly config: Required<AItClientConfig>,
    public readonly generationModelConfig: ModelSpec,
    public readonly embeddingModelConfig: ModelSpec,
  ) {
    const ollamaBaseURL = config.ollama.baseURL || DEFAULT_OLLAMA_BASE_URL;

    this.model = createModel(generationModelConfig.name, ollamaBaseURL) as unknown as CompatibleLanguageModel;

    const ollama = createOllama({
      baseURL: ollamaBaseURL,
    });
    this.embeddingModel = ollama.embedding(String(embeddingModelConfig.name)) as unknown as CompatibleEmbeddingModel;

    if (config.logger) {
      logger.info("[AItClient] Initialized", {
        generationModel: generationModelConfig.name,
        embeddingModel: embeddingModelConfig.name,
        baseURL: ollamaBaseURL,
      });
    }
  }

  public async generateText(options: ModelGenerateOptions): Promise<ModelGenerateResult> {
    const result = await generate({
      prompt: options.prompt,
      messages: options.messages as any,
      tools: options.tools as any,
      temperature: options.temperature,
      topP: options.topP,
      topK: options.topK,
    });

    return {
      text: result.text,
      toolCalls: result.toolCalls as unknown as ToolCall[],
    };
  }

  public async *streamText(options: ModelStreamOptions): AsyncGenerator<string> {
    const { textStream } = await stream({
      prompt: options.prompt as string,
      messages: options.messages as any,
      tools: options.tools as any,
      temperature: options.temperature,
      topP: options.topP,
      topK: options.topK,
    });

    for await (const chunk of textStream) {
      yield chunk;
    }
  }

  public async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: this.embeddingModel as unknown as EmbeddingModel,
      value: text,
    });
    return embedding;
  }

  public async generateStructured<T>(options: LlmStructuredGenerationOptions<T>): Promise<T> {
    return generateStructuredObject({
      prompt: options.prompt,
      schema: options.schema,
      temperature: options.temperature,
      jsonInstruction: options.jsonInstruction,
      maxRetries: options.maxRetries,
    });
  }
}

// Singleton Management
let _clientInstance: AItClient | null = null;
let _textGenerationServiceInstance: TextGenerationService | null = null;
let _config: Required<AItClientConfig> | null = null;

// Default configs inlined (simplified)
const DEFAULT_TEXT_GENERATION_CONFIG = {
  retrievalConfig: { limit: 100, scoreThreshold: 0.4 },
  contextConfig: { maxContextChars: 128000 },
  toolConfig: { maxRounds: 2 },
  retryConfig: { maxRetries: 3, delayMs: 1000 },
};

export function initAItClient(options: Partial<AItClientConfig> = {}): void {
  const generationModelConfig = getGenerationModel();
  const embeddingModelConfig = getEmbeddingModel();

  const finalConfig: Required<AItClientConfig> = {
    generation: {
      model: generationModelConfig.name as GenerationModelName,
      temperature: generationModelConfig.temperature || 0.7,
      topP: generationModelConfig.topP || 0.9,
      topK: generationModelConfig.topK,
      frequencyPenalty: generationModelConfig.frequencyPenalty,
      presencePenalty: generationModelConfig.presencePenalty,
      ...options.generation,
    },
    embeddings: {
      model: embeddingModelConfig.name as EmbeddingModelName,
      vectorSize: embeddingModelConfig.vectorSize,
      ...options.embeddings,
    },
    textGeneration: {
      retrievalConfig: {
        ...DEFAULT_TEXT_GENERATION_CONFIG.retrievalConfig,
        ...(options.textGeneration?.retrievalConfig || {}),
      },
      contextConfig: {
        ...DEFAULT_TEXT_GENERATION_CONFIG.contextConfig,
        ...(options.textGeneration?.contextConfig || {}),
      },
      toolConfig: {
        ...DEFAULT_TEXT_GENERATION_CONFIG.toolConfig,
        ...(options.textGeneration?.toolConfig || {}),
      },
      retryConfig: {
        ...DEFAULT_TEXT_GENERATION_CONFIG.retryConfig,
        ...(options.textGeneration?.retryConfig || {}),
      },
    },
    ollama: {
      baseURL: DEFAULT_OLLAMA_BASE_URL,
      ...options.ollama,
    },
    telemetry: {
      enabled: false,
      publicKey: undefined,
      secretKey: undefined,
      baseURL: undefined,
      flushAt: 1,
      flushInterval: 1000,
      ...options.telemetry,
    },
    logger: options.logger ?? true,
  };

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
      retrievalConfig: config.textGeneration.retrievalConfig,
      contextConfig: config.textGeneration.contextConfig,
      toolConfig: config.textGeneration.toolConfig,
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

export function createModel(modelName: string, baseURL: string = DEFAULT_OLLAMA_BASE_URL): CompatibleLanguageModel {
  const ollama = createOllama({
    baseURL,
  });

  return ollama(modelName) as unknown as CompatibleLanguageModel;
}
