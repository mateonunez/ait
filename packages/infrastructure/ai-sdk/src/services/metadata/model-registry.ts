import { GENERATION_MODELS, getModelSpec } from "../../config/models.config";
import type { ModelCapabilities, ModelMetadata } from "../../types";

/**
 * Transforms a ModelDefinition from config into ModelMetadata for the registry.
 */
function toModelMetadata(id: string): ModelMetadata {
  const spec = getModelSpec(id as any, "generation");

  if (!spec) {
    // Fallback for unknown models
    return {
      id,
      name: id,
      provider: "ollama",
      contextWindow: 128000,
      maxOutputTokens: 64000,
      capabilities: {
        supportsChainOfThought: false,
        supportsTools: true,
        supportsStreaming: true,
        supportsVision: false,
        supportsJsonMode: true,
      },
    };
  }

  const capabilities: ModelCapabilities = {
    supportsChainOfThought: spec.supportsChainOfThought,
    supportsTools: spec.supportsTools,
    supportsStreaming: spec.supportsStreaming,
    supportsVision: spec.supportsVision,
    supportsJsonMode: spec.supportsJsonMode,
  };

  return {
    id: spec.id,
    name: spec.displayName,
    provider: spec.provider,
    contextWindow: spec.contextWindow,
    maxOutputTokens: spec.contextWindow / 2, // Conservative estimate
    capabilities,
  };
}

export function getModelMetadata(modelId: string): ModelMetadata {
  // Try exact match first
  const spec = getModelSpec(modelId as any, "generation");
  if (spec) {
    return toModelMetadata(modelId);
  }

  // Then try fuzzy match
  for (const id of Object.keys(GENERATION_MODELS)) {
    const idBase = id.split(":")[0];
    if (id.startsWith(modelId) || (idBase && modelId.startsWith(idBase))) {
      return toModelMetadata(id);
    }
  }

  // Finally return default metadata
  return toModelMetadata(modelId);
}

export function getAllModels(): ModelMetadata[] {
  return Object.keys(GENERATION_MODELS).map((id) => toModelMetadata(id));
}
