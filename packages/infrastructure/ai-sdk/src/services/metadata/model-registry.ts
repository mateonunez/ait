import { GenerationModels, GENERATION_MODELS } from "../../config/models.config";
import type { ModelMetadata, ModelCapabilities } from "../../types";

function createModelMetadata(
  id: string,
  name: string,
  provider: string,
  configSpec: (typeof GENERATION_MODELS)[keyof typeof GENERATION_MODELS],
): ModelMetadata {
  const capabilities: ModelCapabilities = {
    supportsChainOfThought: provider.includes("deepseek") || provider.includes("qwen"),
    supportsTools: configSpec.supportsTools ?? false,
    supportsStreaming: true,
    supportsVision: false,
    supportsJsonMode: true,
  };

  const contextWindow = configSpec.contextWindow ?? 8192;

  return {
    id,
    name,
    provider,
    contextWindow,
    maxOutputTokens: contextWindow / 2, // Conservative estimate
    capabilities,
  };
}

export const MODEL_REGISTRY = new Map<string, ModelMetadata>([
  [
    "gpt-oss:20b-cloud",
    createModelMetadata(
      "gpt-oss:20b-cloud",
      "GPT-OSS 20B (Cloud)",
      "ollama-cloud",
      GENERATION_MODELS[GenerationModels.GPT_OSS_20B_CLOUD],
    ),
  ],

  [
    "granite4:latest",
    createModelMetadata("granite4:latest", "Granite 4 Latest", "ollama", GENERATION_MODELS[GenerationModels.GRANITE_4]),
  ],

  [
    "llama3.1:latest",
    createModelMetadata("llama3.1:latest", "Llama 3.1", "ollama", {
      vectorSize: 4096,
      contextWindow: 131072,
      description: "Meta's Llama 3.1 model",
      supportsTools: true,
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
    }),
  ],
  [
    "llama3.2:latest",
    createModelMetadata("llama3.2:latest", "Llama 3.2", "ollama", {
      vectorSize: 4096,
      contextWindow: 131072,
      description: "Meta's Llama 3.2 model",
      supportsTools: true,
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
    }),
  ],

  [
    "qwen3:latest",
    createModelMetadata("qwen3:latest", "Qwen3 Latest", "ollama", GENERATION_MODELS[GenerationModels.QWEN3]),
  ],

  [
    "deepseek-r1:latest",
    createModelMetadata(
      "deepseek-r1:latest",
      "DeepSeek R1 Latest",
      "ollama",
      GENERATION_MODELS[GenerationModels.DEEPSEEK_R1],
    ),
  ],

  [
    "gemma3:latest",
    createModelMetadata("gemma3:latest", "Gemma 3 Latest", "ollama", GENERATION_MODELS[GenerationModels.GEMMA_3]),
  ],
]);

export function getModelMetadata(modelId: string): ModelMetadata | null {
  if (MODEL_REGISTRY.has(modelId)) {
    return MODEL_REGISTRY.get(modelId)!;
  }

  for (const [id, model] of MODEL_REGISTRY) {
    const idBase = id.split(":")[0];
    if (id.startsWith(modelId) || (idBase && modelId.startsWith(idBase))) {
      return model;
    }
  }

  return {
    id: modelId,
    name: modelId,
    provider: "ollama",
    contextWindow: 8192,
    maxOutputTokens: 4096,
    capabilities: {
      supportsChainOfThought: false,
      supportsTools: false,
      supportsStreaming: true,
      supportsVision: false,
      supportsJsonMode: false,
    },
  };
}

export function getAllModels(): ModelMetadata[] {
  return Array.from(MODEL_REGISTRY.values());
}
