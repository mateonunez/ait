export enum ModelCapabilityEnum {
  SUPPORTS_CHAIN_OF_THOUGHT = "supportsChainOfThought",
  SUPPORTS_TOOLS = "supportsTools",
  SUPPORTS_STREAMING = "supportsStreaming",
  SUPPORTS_VISION = "supportsVision",
  SUPPORTS_JSON_MODE = "supportsJsonMode",
}

export interface ModelMetadata {
  id: string;
  name: string;
  provider: string;
  capabilities: ModelCapabilities;
  contextWindow: number;
  maxOutputTokens?: number;
  parameters?: ModelParameters;
}

export type ModelCapability = (typeof ModelCapabilityEnum)[keyof typeof ModelCapabilityEnum];
export type ModelCapabilities = Record<ModelCapability, boolean>;

export interface ModelParameters {
  temperature?: number;
  topP?: number;
  topK?: number;
  repetitionPenalty?: number;
  [key: string]: unknown;
}

export interface ModelConfig {
  modelId: string;
  parameters?: Partial<ModelParameters>;
  preferences?: ModelPreferences;
}

export interface ModelPreferences {
  showReasoning?: boolean;
  enableTasks?: boolean;
  showContext?: boolean;
  enableSuggestions?: boolean;
}

export function hasCapability(model: ModelMetadata, capability: ModelCapability): boolean {
  return model.capabilities[capability] === true;
}

export function createDefaultCapabilities(): Record<ModelCapability, boolean> {
  return {
    supportsChainOfThought: false,
    supportsTools: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsJsonMode: false,
  };
}
