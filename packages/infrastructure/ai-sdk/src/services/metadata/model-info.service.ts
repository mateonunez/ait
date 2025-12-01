import {
  type ModelCapabilities,
  type ModelMetadata,
  type ModelParameters,
  createDefaultCapabilities,
} from "../../types";
import { MODEL_REGISTRY, getAllModels, getModelMetadata } from "./model-registry";

export interface IModelInfoService {
  getModelInfo(modelId: string): ModelMetadata | null;
  listModels(): ModelMetadata[];
  detectModelCapabilities(modelId: string): ModelCapabilities;
  registerModel(model: ModelMetadata): void;
}

export class ModelInfoService implements IModelInfoService {
  private models: Map<string, ModelMetadata> = MODEL_REGISTRY;

  registerModel(model: ModelMetadata): void {
    this.models.set(model.id, model);
  }

  getModelInfo(modelId: string): ModelMetadata | null {
    return getModelMetadata(modelId);
  }

  listModels(): ModelMetadata[] {
    return getAllModels();
  }

  detectModelCapabilities(modelId: string): ModelCapabilities {
    const capabilities = createDefaultCapabilities();

    const lowerModelId = modelId.toLowerCase();

    if (lowerModelId.includes("r1") || lowerModelId.includes("qwen") || lowerModelId.includes("deepseek")) {
      capabilities.supportsChainOfThought = true;
    }

    if (
      lowerModelId.includes("32b") ||
      lowerModelId.includes("70b") ||
      lowerModelId.includes("llama3") ||
      lowerModelId.includes("gpt")
    ) {
      capabilities.supportsTools = true;
    }

    capabilities.supportsStreaming = true;

    if (lowerModelId.includes("vision") || lowerModelId.includes("llava") || lowerModelId.includes("gpt-4o")) {
      capabilities.supportsVision = true;
    }

    return capabilities;
  }

  getDefaultParameters(): ModelParameters {
    return {
      temperature: 1,
      topP: 0.9,
      topK: 10,
      repetitionPenalty: 1.1,
    };
  }
}

let modelInfoService: IModelInfoService | null = null;

export function getModelInfoService(): IModelInfoService {
  if (!modelInfoService) {
    modelInfoService = new ModelInfoService();
  }
  return modelInfoService;
}
