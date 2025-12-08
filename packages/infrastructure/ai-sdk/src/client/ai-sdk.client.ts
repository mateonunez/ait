import { AItError, getLogger } from "@ait/core";
import { generateObject, generateText } from "ai";
import dotenv from "dotenv";
import { createOllama } from "ollama-ai-provider-v2";
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
import type { TextGenerationService } from "../services/text-generation/text-generation.service";
import { initLangfuseProvider, resetLangfuseProvider } from "../telemetry/langfuse.provider";
import type { ClientConfig } from "../types/config";
import type {
  EmbeddingsModel,
  GenerationModel,
  ModelGenerateOptions,
  ModelGenerateResult,
  ModelStreamOptions,
} from "../types/models";
import type { OllamaTool } from "../types/providers/ollama.types";
import { OllamaProvider } from "./ollama.provider";

dotenv.config();

export type AItClientConfig = ClientConfig;

export interface LlmGenerateTextOptions {
  prompt: string;
  messages?: ModelGenerateOptions["messages"];
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: OllamaTool[];
}

export interface LlmStreamOptions {
  prompt: string;
  messages?: ModelGenerateOptions["messages"];
  temperature?: number;
  topP?: number;
  topK?: number;
  tools?: OllamaTool[];
}

export interface LlmStructuredGenerationOptions<T> {
  prompt: string;
  schema: ZodType<T>;
  temperature?: number;
  jsonInstruction?: string;
  maxRetries?: number;
}

export interface AItClient {
  config: Required<AItClientConfig>;
  generationModel: GenerationModel;
  embeddingsModel: EmbeddingsModel;
  generationModelConfig: ModelSpec;
  embeddingModelConfig: ModelSpec;
  generateText(options: LlmGenerateTextOptions): Promise<ModelGenerateResult>;
  streamText(options: LlmStreamOptions): AsyncGenerator<string>;
  generateStructured<T>(options: LlmStructuredGenerationOptions<T>): Promise<T>;
}

export const DEFAULT_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const DEFAULT_JSON_INSTRUCTION =
  "IMPORTANT: Respond ONLY with valid JSON that matches the expected schema. Do not include explanations.";
const DEFAULT_STRUCTURED_MAX_RETRIES = 2;

type StructuredModel = ReturnType<ReturnType<typeof createOllama>>;
type TextGenerationServiceType = typeof TextGenerationService;

let _clientInstance: AItClient | null = null;
let _textGenerationServiceInstance: InstanceType<TextGenerationServiceType> | null = null;
let _config: Required<AItClientConfig>;

function augmentPrompt(prompt: string, customInstruction?: string): string {
  if (prompt.includes(DEFAULT_JSON_INSTRUCTION)) {
    return prompt;
  }

  if (customInstruction && prompt.includes(customInstruction)) {
    return prompt;
  }

  return [prompt.trim(), customInstruction ?? DEFAULT_JSON_INSTRUCTION].join("\n\n");
}

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

function extractJson(text: string): string | null {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = text.slice(firstBrace, lastBrace + 1);
  return candidate.trim().length ? candidate : null;
}

function nextDelay(attempt: number, baseDelay?: number): number {
  const delay = baseDelay ?? 500;
  return delay * Math.max(1, attempt + 1);
}

async function wait(ms?: number): Promise<void> {
  if (!ms || ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildAItClient(config: Required<AItClientConfig>): AItClient {
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

  const ollama = new OllamaProvider({
    baseURL: config.ollama.baseURL || DEFAULT_OLLAMA_BASE_URL,
  });

  const generationModel = ollama.createTextModel(String(generationModelName));
  const embeddingsModel = ollama.createEmbeddingsModel(String(embeddingsModelName));

  const rawBaseURL = config.ollama.baseURL || DEFAULT_OLLAMA_BASE_URL;
  const apiBaseURL = rawBaseURL.endsWith("/api") ? rawBaseURL : `${rawBaseURL}/api`;
  const structuredProvider = createOllama({ baseURL: apiBaseURL });
  const structuredModel = structuredProvider(String(generationModelName));

  const clientInstance: AItClient = {
    config,
    generationModel,
    embeddingsModel,
    generationModelConfig,
    embeddingModelConfig,

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

    async *streamText(options: LlmStreamOptions): AsyncGenerator<string> {
      const streamOptions: ModelStreamOptions = {
        prompt: options.prompt,
        messages: options.messages,
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

export interface InitOptions {
  preset?: PresetName;
  overrides?: Partial<ClientConfig>;
}

export function initAItClient(options: InitOptions | Partial<AItClientConfig> = {}): void {
  let finalConfig: Required<AItClientConfig>;

  if ("preset" in options && options.preset) {
    finalConfig = mergePresetWithOverrides(options.preset, options.overrides);
  } else {
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
    _clientInstance = buildAItClient(_config);
  }
  return _clientInstance;
}

export function getTextGenerationService(): InstanceType<TextGenerationServiceType> {
  if (!_textGenerationServiceInstance) {
    const { TextGenerationService } = require("../services/text-generation/text-generation.service");

    if (!_config) {
      initAItClient();
    }

    _textGenerationServiceInstance = new TextGenerationService({
      multipleQueryPlannerConfig: _config.textGeneration.multipleQueryPlannerConfig,
      conversationConfig: _config.textGeneration.conversationConfig,
      contextPreparationConfig: _config.textGeneration.contextPreparationConfig,
      toolExecutionConfig: _config.textGeneration.toolExecutionConfig,
      retryConfig: _config.textGeneration.retryConfig,
    });
  }
  return _textGenerationServiceInstance as InstanceType<TextGenerationServiceType>;
}

export function resetAItClientInstance(): void {
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

export function modelSupportsTools(): boolean {
  const config = getGenerationModelConfig();
  return config.supportsTools ?? true;
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
