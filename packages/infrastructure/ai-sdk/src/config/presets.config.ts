import { GenerationModels, EmbeddingModels } from "./models.config";
import type { ClientConfig } from "../types/config";

export type PresetName = "basic" | "rag-optimized" | "tool-focused" | "conversational" | "production";

export interface PresetConfig extends Required<ClientConfig> {
  name: PresetName;
  description: string;
}

const BASIC_PRESET: PresetConfig = {
  name: "basic",
  description: "Simple text generation without RAG or advanced features",
  generation: {
    model: GenerationModels.GEMMA_3,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
  },
  embeddings: {
    model: EmbeddingModels.MXBAI_EMBED_LARGE,
    vectorSize: 1024,
  },
  rag: {
    strategy: "single",
    maxDocs: 20,
    collectionRouting: {
      strategy: "heuristic",
      enableLLMRouting: false,
      fallbackToHeuristic: true,
      minConfidenceThreshold: 0.5,
      temperature: 0.3,
    },
  },
  textGeneration: {
    multipleQueryPlannerConfig: {
      maxDocs: 20,
      queriesCount: 3,
      concurrency: 2,
    },
    conversationConfig: {
      maxRecentMessages: 5,
      maxHistoryTokens: 2000,
      enableSummarization: false,
    },
    contextPreparationConfig: {
      enableRAG: false,
      cacheDurationMs: 0,
      topicSimilarityThreshold: 0.9,
    },
    toolExecutionConfig: {
      maxRounds: 1,
      toolTimeoutMs: 15000,
    },
    retryConfig: {
      maxRetries: 2,
      delayMs: 500,
      backoffMultiplier: 1.5,
    },
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  },
  telemetry: {
    enabled: false,
    flushAt: 1,
    flushInterval: 1000,
  },
  logger: true,
};

const RAG_OPTIMIZED_PRESET: PresetConfig = {
  name: "rag-optimized",
  description: "Multi-collection RAG with advanced retrieval and ranking",
  generation: {
    model: GenerationModels.GPT_OSS_20B,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
  },
  embeddings: {
    model: EmbeddingModels.MXBAI_EMBED_LARGE,
    vectorSize: 1024,
  },
  rag: {
    strategy: "multi-collection",
    maxDocs: 100,
    collectionRouting: {
      strategy: "llm",
      enableLLMRouting: true,
      fallbackToHeuristic: true,
      minConfidenceThreshold: 0.4,
      temperature: 0.3,
    },
  },
  textGeneration: {
    multipleQueryPlannerConfig: {
      maxDocs: 100,
      queriesCount: 12,
      concurrency: 4,
    },
    conversationConfig: {
      maxRecentMessages: 8,
      maxHistoryTokens: 3000,
      enableSummarization: false,
    },
    contextPreparationConfig: {
      enableRAG: true,
      cacheDurationMs: 5 * 60 * 1000,
      topicSimilarityThreshold: 0.95,
    },
    toolExecutionConfig: {
      maxRounds: 2,
      toolTimeoutMs: 30000,
    },
    retryConfig: {
      maxRetries: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
    },
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  },
  telemetry: {
    enabled: false,
    flushAt: 1,
    flushInterval: 1000,
  },
  logger: true,
};

const TOOL_FOCUSED_PRESET: PresetConfig = {
  name: "tool-focused",
  description: "Optimized for tool calling with extended timeouts",
  generation: {
    model: GenerationModels.GPT_OSS_20B,
    temperature: 0.5,
    topP: 0.85,
    topK: 30,
  },
  embeddings: {
    model: EmbeddingModels.MXBAI_EMBED_LARGE,
    vectorSize: 1024,
  },
  rag: {
    strategy: "multi-query",
    maxDocs: 50,
    collectionRouting: {
      strategy: "llm",
      enableLLMRouting: true,
      fallbackToHeuristic: true,
      minConfidenceThreshold: 0.5,
      temperature: 0.2,
    },
  },
  textGeneration: {
    multipleQueryPlannerConfig: {
      maxDocs: 50,
      queriesCount: 8,
      concurrency: 3,
    },
    conversationConfig: {
      maxRecentMessages: 10,
      maxHistoryTokens: 4000,
      enableSummarization: false,
    },
    contextPreparationConfig: {
      enableRAG: true,
      cacheDurationMs: 2 * 60 * 1000,
      topicSimilarityThreshold: 0.85,
    },
    toolExecutionConfig: {
      maxRounds: 3,
      toolTimeoutMs: 60000,
    },
    retryConfig: {
      maxRetries: 4,
      delayMs: 800,
      backoffMultiplier: 2,
    },
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  },
  telemetry: {
    enabled: false,
    flushAt: 1,
    flushInterval: 1000,
  },
  logger: true,
};

const CONVERSATIONAL_PRESET: PresetConfig = {
  name: "conversational",
  description: "Optimized for multi-turn conversations with history management",
  generation: {
    model: GenerationModels.QWEN3,
    temperature: 0.8,
    topP: 0.92,
    topK: 45,
  },
  embeddings: {
    model: EmbeddingModels.MXBAI_EMBED_LARGE,
    vectorSize: 1024,
  },
  rag: {
    strategy: "multi-query",
    maxDocs: 60,
    collectionRouting: {
      strategy: "llm",
      enableLLMRouting: true,
      fallbackToHeuristic: true,
      minConfidenceThreshold: 0.45,
      temperature: 0.3,
    },
  },
  textGeneration: {
    multipleQueryPlannerConfig: {
      maxDocs: 60,
      queriesCount: 8,
      concurrency: 3,
    },
    conversationConfig: {
      maxRecentMessages: 15,
      maxHistoryTokens: 6000,
      enableSummarization: true,
    },
    contextPreparationConfig: {
      enableRAG: true,
      cacheDurationMs: 10 * 60 * 1000,
      topicSimilarityThreshold: 0.9,
    },
    toolExecutionConfig: {
      maxRounds: 2,
      toolTimeoutMs: 30000,
    },
    retryConfig: {
      maxRetries: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
    },
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  },
  telemetry: {
    enabled: false,
    flushAt: 1,
    flushInterval: 1000,
  },
  logger: true,
};

const PRODUCTION_PRESET: PresetConfig = {
  name: "production",
  description: "Balanced configuration for production workloads with telemetry",
  generation: {
    model: GenerationModels.GPT_OSS_20B_CLOUD,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
  },
  embeddings: {
    model: EmbeddingModels.MXBAI_EMBED_LARGE,
    vectorSize: 1024,
  },
  rag: {
    strategy: "multi-collection",
    maxDocs: 80,
    collectionRouting: {
      strategy: "llm",
      enableLLMRouting: true,
      fallbackToHeuristic: true,
      minConfidenceThreshold: 0.4,
      temperature: 0.3,
    },
    collectionDiversity: {
      minDocsPerCollection: 3,
      maxCollectionDominance: 0.5,
      enforceMinRepresentation: true,
      interleavingStrategy: "weighted",
    },
  },
  textGeneration: {
    multipleQueryPlannerConfig: {
      maxDocs: 80,
      queriesCount: 10,
      concurrency: 4,
    },
    conversationConfig: {
      maxRecentMessages: 10,
      maxHistoryTokens: 4000,
      enableSummarization: false,
    },
    contextPreparationConfig: {
      enableRAG: true,
      cacheDurationMs: 5 * 60 * 1000,
      topicSimilarityThreshold: 0.92,
    },
    toolExecutionConfig: {
      maxRounds: 2,
      toolTimeoutMs: 30000,
    },
    retryConfig: {
      maxRetries: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
    },
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  },
  telemetry: {
    enabled: true,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseURL: process.env.LANGFUSE_BASE_URL,
    flushAt: 10,
    flushInterval: 5000,
  },
  logger: true,
};

const PRESETS: Record<PresetName, PresetConfig> = {
  basic: BASIC_PRESET,
  "rag-optimized": RAG_OPTIMIZED_PRESET,
  "tool-focused": TOOL_FOCUSED_PRESET,
  conversational: CONVERSATIONAL_PRESET,
  production: PRODUCTION_PRESET,
};

export function getPreset(name: PresetName): PresetConfig {
  return PRESETS[name];
}

export function listPresets(): PresetConfig[] {
  return Object.values(PRESETS);
}

export function mergePresetWithOverrides(
  presetName: PresetName,
  overrides: Partial<ClientConfig> = {},
): Required<ClientConfig> {
  const preset = getPreset(presetName);

  return {
    generation: {
      ...preset.generation,
      ...overrides.generation,
    },
    embeddings: {
      ...preset.embeddings,
      ...overrides.embeddings,
    },
    rag: {
      ...preset.rag,
      ...(overrides.rag || {}),
      collectionRouting: {
        ...preset.rag.collectionRouting,
        ...(overrides.rag?.collectionRouting || {}),
      },
      collectionDiversity: {
        ...(preset.rag.collectionDiversity || {}),
        ...(overrides.rag?.collectionDiversity || {}),
      },
    },
    textGeneration: {
      multipleQueryPlannerConfig: {
        ...preset.textGeneration.multipleQueryPlannerConfig,
        ...(overrides.textGeneration?.multipleQueryPlannerConfig || {}),
      },
      conversationConfig: {
        ...preset.textGeneration.conversationConfig,
        ...(overrides.textGeneration?.conversationConfig || {}),
      },
      contextPreparationConfig: {
        ...preset.textGeneration.contextPreparationConfig,
        ...(overrides.textGeneration?.contextPreparationConfig || {}),
      },
      toolExecutionConfig: {
        ...preset.textGeneration.toolExecutionConfig,
        ...(overrides.textGeneration?.toolExecutionConfig || {}),
      },
      retryConfig: {
        ...preset.textGeneration.retryConfig,
        ...(overrides.textGeneration?.retryConfig || {}),
      },
    },
    ollama: {
      ...preset.ollama,
      ...overrides.ollama,
    },
    telemetry: {
      ...preset.telemetry,
      ...overrides.telemetry,
    },
    logger: overrides.logger !== undefined ? overrides.logger : preset.logger,
  };
}
