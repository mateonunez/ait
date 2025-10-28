import dotenv from "dotenv";

dotenv.config();

export enum Models {
  GENERATION = "generation",
  EMBEDDING = "embedding",
}

export enum GenerationModels {
  GPT_OSS_20B = "gpt-oss:20b",
  QWEN3 = "qwen3:latest",
  DEEPSEEK_R1 = "deepseek-r1:latest",
  GEMMA_3 = "gemma3:latest",
  GRANITE_4 = "granite4:latest",
}

export enum EmbeddingModels {
  MXBAI_EMBED_LARGE = "mxbai-embed-large:latest",
  QWEN3_EMBEDDING = "qwen3-embedding:latest",
  BGE_M3 = "bge-m3:latest",
}

export type GenerationModelName = GenerationModels;
export type EmbeddingModelName = EmbeddingModels;
export type ModelName = GenerationModelName | EmbeddingModelName;

export interface ModelSpec {
  name: ModelName;
  vectorSize: number;
  contextWindow?: number;
  description?: string;
  supportsTools?: boolean;
  // AI SDK specific options
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export type ModelType = "generation" | "embedding";

export const GENERATION_MODELS: Record<GenerationModelName, Omit<ModelSpec, "name">> = {
  [GenerationModels.GPT_OSS_20B]: {
    vectorSize: 4096,
    contextWindow: 128000,
    description: "OpenAI's open-weight 20B model for powerful reasoning and agentic tasks",
    supportsTools: true,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
  },
  [GenerationModels.QWEN3]: {
    vectorSize: 4096,
    contextWindow: 32768,
    description: "Qwen3 model for general-purpose text generation",
    supportsTools: true,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
  },
  [GenerationModels.DEEPSEEK_R1]: {
    vectorSize: 4096,
    contextWindow: 32768,
    description: "DeepSeek R1 model for reasoning tasks",
    supportsTools: true,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
  },
  [GenerationModels.GEMMA_3]: {
    vectorSize: 4096,
    contextWindow: 32768,
    description: "Gemma 3 model for general-purpose text generation",
    supportsTools: false,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
  },
  [GenerationModels.GRANITE_4]: {
    vectorSize: 4096,
    contextWindow: 32768,
    description: "Granite 4 model for general-purpose text generation",
    supportsTools: true,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
  },
};

export const EMBEDDING_MODELS: Record<EmbeddingModelName, Omit<ModelSpec, "name">> = {
  [EmbeddingModels.MXBAI_EMBED_LARGE]: {
    vectorSize: 1024,
    description: "MixedBread.ai large embedding model - recommended for semantic search",
  },
  [EmbeddingModels.QWEN3_EMBEDDING]: {
    vectorSize: 4096,
    description: "Qwen3 embedding model for general-purpose embeddings",
  },
  [EmbeddingModels.BGE_M3]: {
    vectorSize: 1024,
    description: "BGE-M3 multilingual embedding model",
  },
};

const DEFAULT_GENERATION_MODEL_NAME: GenerationModelName = GenerationModels.GEMMA_3;
const DEFAULT_EMBEDDING_MODEL_NAME: EmbeddingModelName = EmbeddingModels.MXBAI_EMBED_LARGE;

export function getGenerationModel(): ModelSpec {
  const modelName = (process.env.GENERATION_MODEL || DEFAULT_GENERATION_MODEL_NAME) as GenerationModelName;
  const modelSpec = GENERATION_MODELS[modelName];

  if (!modelSpec) {
    console.warn(
      `Unknown generation model '${modelName}'. Available models: ${Object.keys(GENERATION_MODELS).join(", ")}`,
    );

    const fallbackSpec = GENERATION_MODELS[DEFAULT_GENERATION_MODEL_NAME];

    return {
      name: modelName,
      vectorSize: Number(process.env.GENERATION_VECTOR_SIZE || fallbackSpec.vectorSize),
      contextWindow: fallbackSpec.contextWindow,
      description: "Custom generation model",
      supportsTools: true,
      temperature: Number(process.env.GENERATION_TEMPERATURE || fallbackSpec.temperature || 0.7),
      topP: Number(process.env.GENERATION_TOP_P || fallbackSpec.topP || 0.9),
    };
  }

  const result = {
    name: modelName,
    vectorSize: Number(process.env.GENERATION_VECTOR_SIZE || modelSpec.vectorSize),
    contextWindow: modelSpec.contextWindow,
    description: modelSpec.description,
    supportsTools: modelSpec.supportsTools,
    temperature: Number(process.env.GENERATION_TEMPERATURE || modelSpec.temperature || 0.7),
    topP: Number(process.env.GENERATION_TOP_P || modelSpec.topP || 0.9),
    topK: modelSpec.topK ? Number(process.env.GENERATION_TOP_K || modelSpec.topK) : undefined,
    frequencyPenalty: modelSpec.frequencyPenalty
      ? Number(process.env.GENERATION_FREQUENCY_PENALTY || modelSpec.frequencyPenalty)
      : undefined,
    presencePenalty: modelSpec.presencePenalty
      ? Number(process.env.GENERATION_PRESENCE_PENALTY || modelSpec.presencePenalty)
      : undefined,
  };

  return result;
}

export function getEmbeddingModel(): ModelSpec {
  const modelName = (process.env.EMBEDDINGS_MODEL || DEFAULT_EMBEDDING_MODEL_NAME) as EmbeddingModelName;
  const modelSpec = EMBEDDING_MODELS[modelName];

  if (!modelSpec) {
    console.warn(
      `Unknown embedding model '${modelName}'. Available models: ${Object.keys(EMBEDDING_MODELS).join(", ")}`,
    );

    const fallbackSpec = EMBEDDING_MODELS[DEFAULT_EMBEDDING_MODEL_NAME];
    return {
      name: modelName,
      vectorSize: Number(process.env.EMBEDDINGS_VECTOR_SIZE || fallbackSpec.vectorSize),
      description: "Custom embedding model",
    };
  }

  const result = {
    name: modelName,
    vectorSize: Number(process.env.EMBEDDINGS_VECTOR_SIZE || modelSpec.vectorSize),
    description: modelSpec.description,
  };

  return result;
}

export function getAvailableModels(type: ModelType): string[] {
  return type === "generation" ? Object.keys(GENERATION_MODELS) : Object.keys(EMBEDDING_MODELS);
}

export function isModelAvailable(modelName: ModelName, type: ModelType): boolean {
  const models = type === "generation" ? GENERATION_MODELS : EMBEDDING_MODELS;
  return modelName in models;
}

export function getModelSpec(modelName: ModelName, type: ModelType): ModelSpec | undefined {
  const models = type === "generation" ? GENERATION_MODELS : EMBEDDING_MODELS;
  return models[modelName as keyof typeof models];
}
