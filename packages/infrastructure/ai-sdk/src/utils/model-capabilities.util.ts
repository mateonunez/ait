import type { ModelMetadata, ModelCapability } from "../types";

/**
 * Check if a model supports a specific capability
 */
export function supportsCapability(model: ModelMetadata, capability: ModelCapability): boolean {
  return model.capabilities[capability] === true;
}

/**
 * Get human-readable capability descriptions
 */
export function getCapabilityLabel(capability: ModelCapability): string {
  const labels: Record<ModelCapability, string> = {
    supportsChainOfThought: "Chain of Thought",
    supportsTools: "Tool Calling",
    supportsStreaming: "Streaming",
    supportsVision: "Vision",
    supportsJsonMode: "JSON Mode",
  };
  return labels[capability] || capability;
}

/**
 * Get capability icon name (lucide-react)
 */
export function getCapabilityIcon(capability: ModelCapability): string {
  const icons: Record<ModelCapability, string> = {
    supportsChainOfThought: "brain",
    supportsTools: "wrench",
    supportsStreaming: "activity",
    supportsVision: "eye",
    supportsJsonMode: "code",
  };
  return icons[capability] || "check";
}

/**
 * Filter models by capabilities
 */
export function filterModelsByCapabilities(
  models: ModelMetadata[],
  requiredCapabilities: ModelCapability[],
): ModelMetadata[] {
  return models.filter((model) => requiredCapabilities.every((cap) => model.capabilities[cap]));
}

/**
 * Get formatted context window size
 */
export function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M tokens`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K tokens`;
  }
  return `${tokens} tokens`;
}

/**
 * Compare models by capabilities (for sorting)
 */
export function compareModelCapabilities(a: ModelMetadata, b: ModelMetadata): number {
  // Count enabled capabilities
  const aCount = Object.values(a.capabilities).filter(Boolean).length;
  const bCount = Object.values(b.capabilities).filter(Boolean).length;

  // Sort by capability count (descending)
  if (aCount !== bCount) {
    return bCount - aCount;
  }

  // Then by context window size (descending)
  return b.contextWindow - a.contextWindow;
}
