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
}

export enum EmbeddingModels {
  MXBAI_EMBED_LARGE = "mxbai-embed-large:latest",
  QWEN3_EMBEDDING = "qwen3-embedding:latest",
  BGE_M3 = "bge-m3:latest",
}

export interface ModelSpec {
  name: keyof typeof GenerationModels | keyof typeof EmbeddingModels;
  vectorSize: number;
  contextWindow?: number;
  description?: string;
}

export type ModelType = "generation" | "embedding";

export const GENERATION_MODELS: Record<string, Omit<ModelSpec, "name">> = {
  [GenerationModels.GPT_OSS_20B]: {
    vectorSize: 4096,
    contextWindow: 128000,
    description: "OpenAI's open-weight 20B model for powerful reasoning and agentic tasks",
  },
  [GenerationModels.QWEN3]: {
    vectorSize: 4096,
    contextWindow: 32768,
    description: "Qwen3 model for general-purpose text generation",
  },
  [GenerationModels.DEEPSEEK_R1]: {
    vectorSize: 4096,
    contextWindow: 32768,
    description: "DeepSeek R1 model for reasoning tasks",
  },
  [GenerationModels.GEMMA_3]: {
    vectorSize: 4096,
    contextWindow: 32768,
    description: "Gemma 3 model for general-purpose text generation",
  },
};

export const EMBEDDING_MODELS: Record<string, Omit<ModelSpec, "name">> = {
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

const DEFAULT_GENERATION_MODEL_NAME = GenerationModels.GEMMA_3;
const DEFAULT_EMBEDDING_MODEL_NAME = EmbeddingModels.MXBAI_EMBED_LARGE;

export function getGenerationModel(): ModelSpec {
  const modelName = (process.env.GENERATION_MODEL || DEFAULT_GENERATION_MODEL_NAME) as keyof typeof GenerationModels;
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
    };
  }

  const result = {
    name: modelName,
    vectorSize: Number(process.env.GENERATION_VECTOR_SIZE || modelSpec.vectorSize),
    contextWindow: modelSpec.contextWindow,
    description: modelSpec.description,
  };

  return result;
}

export function getEmbeddingModel(): ModelSpec {
  const modelName = (process.env.EMBEDDINGS_MODEL || DEFAULT_EMBEDDING_MODEL_NAME) as keyof typeof EmbeddingModels;
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

export function isModelAvailable(modelName: string, type: ModelType): boolean {
  const models = type === "generation" ? GENERATION_MODELS : EMBEDDING_MODELS;
  return modelName in models;
}

export function getModelSpec(modelName: string, type: ModelType): ModelSpec | undefined {
  const models = type === "generation" ? GENERATION_MODELS : EMBEDDING_MODELS;
  const spec = models[modelName];

  if (!spec) {
    return undefined;
  }

  return {
    name: modelName as keyof typeof GenerationModels | keyof typeof EmbeddingModels,
    ...spec,
  };
}
