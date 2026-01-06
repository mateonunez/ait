import { getLogger } from "@ait/core";
import dotenv from "dotenv";

dotenv.config();

const logger = getLogger();

export enum GenerationModels {
  GPT_OSS_20B = "gpt-oss:20b",
  GPT_OSS_20B_CLOUD = "gpt-oss:20b-cloud",
  NEMOTRON_3_NANO_30B_CLOUD = "nemotron-3-nano:30b-cloud",
  QWEN3 = "qwen3:latest",
  DEEPSEEK_R1 = "deepseek-r1:latest",
  GEMMA_3 = "gemma3:latest",
  GRANITE_4 = "granite4:latest",
  KIMI_K2_THINKING_CLOUD = "kimi-k2-thinking:cloud",
  LLAVA = "llava:latest",
}

export enum EmbeddingModels {
  MXBAI_EMBED_LARGE = "mxbai-embed-large:latest",
  QWEN3_EMBEDDING = "qwen3-embedding:latest",
  BGE_M3 = "bge-m3:latest",
}

export enum FunctionModels {
  FUNCTION_GEMMA = "gemma3:latest",
}

export type GenerationModelName = GenerationModels;
export type EmbeddingModelName = EmbeddingModels;
export type ModelName = GenerationModelName | EmbeddingModelName;

export type ModelProvider = "ollama" | "ollama-cloud" | "openai" | "anthropic" | "google" | "deepseek" | "mistral";

/**
 * Unified model definition combining technical parameters and UI metadata.
 */
export interface ModelDefinition {
  // Identity
  id: string;
  name: ModelName; // For internal usage and enum compatibility
  displayName: string;
  provider: ModelProvider;
  description: string;

  // Capabilities
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  supportsJsonMode: boolean;
  supportsStructuredOutputs: boolean;
  supportsChainOfThought: boolean;

  // Generation Parameters
  temperature: number;
  topP: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;

  // Ollama thinking mode (chain-of-thought reasoning)
  enableThinking?: boolean | "low" | "medium" | "high";

  // Embedding (optional)
  vectorSize?: number;
}

// Keep ModelSpec as an alias for backward compatibility for now
export type ModelSpec = ModelDefinition;

export type ModelType = "generation" | "embedding";

const DEFAULT_CONFIG: Omit<ModelDefinition, "id" | "name" | "displayName" | "provider" | "description"> = {
  vectorSize: 4096,
  contextWindow: 128000,
  supportsTools: true,
  supportsVision: false,
  supportsStreaming: true,
  supportsJsonMode: true,
  supportsStructuredOutputs: true,
  supportsChainOfThought: false,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
};

export const GENERATION_MODELS: Record<GenerationModelName, Omit<ModelDefinition, "name">> = {
  [GenerationModels.GPT_OSS_20B]: {
    ...DEFAULT_CONFIG,
    id: GenerationModels.GPT_OSS_20B,
    displayName: "GPT-OSS 20B",
    provider: "ollama",
    description: "OpenAI's open-weight 20B model for powerful reasoning and agentic tasks",
    supportsChainOfThought: true,
    enableThinking: true,
  },
  [GenerationModels.GPT_OSS_20B_CLOUD]: {
    ...DEFAULT_CONFIG,
    id: GenerationModels.GPT_OSS_20B_CLOUD,
    displayName: "GPT-OSS 20B (Cloud)",
    provider: "ollama-cloud",
    description: "OpenAI's open-weight 20B model for powerful reasoning and agentic tasks",
    supportsChainOfThought: true,
    enableThinking: true,
  },
  [GenerationModels.QWEN3]: {
    ...DEFAULT_CONFIG,
    id: GenerationModels.QWEN3,
    displayName: "Qwen 3",
    provider: "ollama",
    contextWindow: 32768,
    description: "Qwen3 model for general-purpose text generation",
    supportsChainOfThought: true,
    enableThinking: true,
  },
  [GenerationModels.DEEPSEEK_R1]: {
    ...DEFAULT_CONFIG,
    id: GenerationModels.DEEPSEEK_R1,
    displayName: "DeepSeek R1",
    provider: "ollama",
    contextWindow: 32768,
    description: "DeepSeek R1 model for reasoning tasks",
    supportsTools: false,
    supportsChainOfThought: true,
    // DeepSeek R1 enables thinking by default, but we set it for consistency
    enableThinking: true,
  },
  [GenerationModels.GEMMA_3]: {
    ...DEFAULT_CONFIG,
    id: GenerationModels.GEMMA_3,
    displayName: "Gemma 3",
    provider: "ollama",
    contextWindow: 32768,
    description: "Gemma 3 model for general-purpose text generation",
  },
  [GenerationModels.GRANITE_4]: {
    ...DEFAULT_CONFIG,
    id: GenerationModels.GRANITE_4,
    displayName: "Granite 4",
    provider: "ollama",
    contextWindow: 32768,
    description: "Granite 4 model for general-purpose text generation",
  },
  [GenerationModels.KIMI_K2_THINKING_CLOUD]: {
    ...DEFAULT_CONFIG,
    id: GenerationModels.KIMI_K2_THINKING_CLOUD,
    displayName: "Kimi K2 Thinking",
    provider: "ollama-cloud",
    contextWindow: 128000,
    description: "Kimi K2 Thinking model for advanced reasoning and complex problem-solving",
    supportsChainOfThought: true,
    enableThinking: true,
  },
  [GenerationModels.LLAVA]: {
    ...DEFAULT_CONFIG,
    id: GenerationModels.LLAVA,
    displayName: "LLaVA",
    provider: "ollama",
    contextWindow: 4096,
    description: "LLaVA model for vision-language tasks",
    supportsVision: true,
  },
  [GenerationModels.NEMOTRON_3_NANO_30B_CLOUD]: {
    ...DEFAULT_CONFIG,
    id: GenerationModels.NEMOTRON_3_NANO_30B_CLOUD,
    displayName: "Nemotron 3 Nano 30B",
    provider: "ollama-cloud",
    contextWindow: 128000,
    description: "Nemotron 3 Nano 30B model with reasoning capabilities",
    supportsChainOfThought: true,
    // NVIDIA recommends temperature=1.0 and topP=1.0 for reasoning tasks
    temperature: 1.0,
    topP: 1.0,
    topK: 50,
    // Enable Ollama thinking mode for better reasoning
    enableThinking: true,
  },
};

export const EMBEDDING_MODELS: Record<EmbeddingModelName, Omit<ModelDefinition, "name">> = {
  [EmbeddingModels.MXBAI_EMBED_LARGE]: {
    ...DEFAULT_CONFIG,
    id: EmbeddingModels.MXBAI_EMBED_LARGE,
    displayName: "mxbai-embed-large",
    provider: "ollama",
    vectorSize: 1024,
    description: "MixedBread.ai large embedding model - recommended for semantic search",
  },
  [EmbeddingModels.QWEN3_EMBEDDING]: {
    ...DEFAULT_CONFIG,
    id: EmbeddingModels.QWEN3_EMBEDDING,
    displayName: "Qwen 3 Embedding",
    provider: "ollama",
    vectorSize: 4096,
    description: "Qwen3 embedding model for general-purpose embeddings",
  },
  [EmbeddingModels.BGE_M3]: {
    ...DEFAULT_CONFIG,
    id: EmbeddingModels.BGE_M3,
    displayName: "BGE-M3",
    provider: "ollama",
    vectorSize: 1024,
    description: "BGE-M3 multilingual embedding model",
  },
};

const DEFAULT_GENERATION_MODEL_NAME: GenerationModelName = GenerationModels.GEMMA_3;
const DEFAULT_EMBEDDING_MODEL_NAME: EmbeddingModelName = EmbeddingModels.MXBAI_EMBED_LARGE;

export function getGenerationModel(): ModelDefinition {
  const modelName = (process.env.GENERATION_MODEL || DEFAULT_GENERATION_MODEL_NAME) as GenerationModelName;
  const modelSpec = GENERATION_MODELS[modelName];

  if (!modelSpec) {
    logger.warn(
      `Unknown generation model '${modelName}'. Available models: ${Object.keys(GENERATION_MODELS).join(", ")}`,
    );

    const fallbackSpec = GENERATION_MODELS[DEFAULT_GENERATION_MODEL_NAME];

    return {
      ...fallbackSpec,
      name: DEFAULT_GENERATION_MODEL_NAME,
      temperature: Number(process.env.GENERATION_TEMPERATURE || fallbackSpec.temperature),
      topP: Number(process.env.GENERATION_TOP_P || fallbackSpec.topP),
    } as ModelDefinition;
  }

  return {
    ...modelSpec,
    name: modelName,
    temperature: Number(process.env.GENERATION_TEMPERATURE || modelSpec.temperature),
    topP: Number(process.env.GENERATION_TOP_P || modelSpec.topP),
    topK: modelSpec.topK ? Number(process.env.GENERATION_TOP_K || modelSpec.topK) : undefined,
    frequencyPenalty: modelSpec.frequencyPenalty
      ? Number(process.env.GENERATION_FREQUENCY_PENALTY || modelSpec.frequencyPenalty)
      : undefined,
    presencePenalty: modelSpec.presencePenalty
      ? Number(process.env.GENERATION_PRESENCE_PENALTY || modelSpec.presencePenalty)
      : undefined,
  } as ModelDefinition;
}

export function getEmbeddingModel(): ModelDefinition {
  const modelName = (process.env.EMBEDDINGS_MODEL || DEFAULT_EMBEDDING_MODEL_NAME) as EmbeddingModelName;
  const modelSpec = EMBEDDING_MODELS[modelName];

  if (!modelSpec) {
    logger.warn(
      `Unknown embedding model '${modelName}'. Available models: ${Object.keys(EMBEDDING_MODELS).join(", ")}`,
    );

    const fallbackSpec = EMBEDDING_MODELS[DEFAULT_EMBEDDING_MODEL_NAME];
    return {
      ...fallbackSpec,
      name: DEFAULT_EMBEDDING_MODEL_NAME,
    } as ModelDefinition;
  }

  return {
    ...modelSpec,
    name: modelName,
  } as ModelDefinition;
}

export function getModelSpec(modelName: ModelName, type: ModelType): ModelDefinition | undefined {
  const models = type === "generation" ? GENERATION_MODELS : EMBEDDING_MODELS;
  const spec = models[modelName as keyof typeof models] as Omit<ModelDefinition, "name"> | undefined;

  if (!spec) {
    return undefined;
  }

  return {
    ...spec,
    name: modelName,
  } as ModelDefinition;
}

export function getModelCapabilities(modelName?: string): { contextWindow: number; supportsTools: boolean } {
  const DEFAULT_CONTEXT_WINDOW = 120_000;
  const DEFAULT_SUPPORTS_TOOLS = true;

  if (!modelName) {
    return { contextWindow: DEFAULT_CONTEXT_WINDOW, supportsTools: DEFAULT_SUPPORTS_TOOLS };
  }

  const spec = GENERATION_MODELS[modelName as GenerationModelName];
  if (!spec) {
    return { contextWindow: DEFAULT_CONTEXT_WINDOW, supportsTools: DEFAULT_SUPPORTS_TOOLS };
  }

  return {
    contextWindow: spec.contextWindow,
    supportsTools: spec.supportsTools,
  };
}
