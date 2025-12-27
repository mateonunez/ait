// ============================================================================
// Vercel AI SDK - Re-exported for direct usage
// ============================================================================
// These are the native Vercel AI SDK functions. Use these for simple cases
// or when you want direct control without AIT wrappers.
export {
  streamText,
  generateText,
  generateObject,
  streamObject,
  embed,
  embedMany,
  tool,
  type LanguageModel,
  type EmbeddingModel,
  type StreamTextResult,
  type GenerateTextResult,
  type GenerateObjectResult,
  type StreamObjectResult,
  type EmbedResult,
  type EmbedManyResult,
} from "ai";

// ============================================================================
// AIT Thin Wrappers - Vercel SDK + optional AIT enhancements (telemetry, RAG)
// ============================================================================
// Use these for AIT-enhanced generation with opt-in telemetry.
export {
  stream,
  streamChunks,
  generate,
  type StreamOptions,
  type StreamResult,
  type TextGenerateOptions,
  type TextGenerateResult,
} from "./generation";

// Composable RAG functions (replaces complex pipeline stages)
export {
  retrieve,
  rerank,
  type RetrieveOptions,
  type RetrieveResult,
  type RetrievedDocument,
  type RerankOptions,
  type RerankResult,
} from "./rag";

// ============================================================================
// AIT Client & Configuration
// ============================================================================
export {
  initAItClient,
  getAItClient,
  getTextGenerationService,
  resetAItClientInstance,
  getClientConfig,
  getGenerationModelConfig,
  getEmbeddingModelConfig,
  modelSupportsTools,
  getModelCapabilities,
  type AItClient,
  type AItClientConfig,
  type InitOptions,
} from "./client/ai-sdk.client";

export {
  getGenerationModel,
  getEmbeddingModel,
  getModelSpec,
  GenerationModels,
  EmbeddingModels,
  type GenerationModelName,
  type EmbeddingModelName,
  type ModelName,
  type ModelSpec,
  type ModelType,
} from "./config/models.config";

export {
  getPreset,
  listPresets,
  mergePresetWithOverrides,
  type PresetName,
  type PresetConfig,
} from "./config/presets.config";

export {
  getAllCollections,
  getCollectionsByEntityTypes,
  getCollectionConfig,
  getCollectionNameByVendor,
  getCollectionsNames,
  getCollectionByEntityType,
  getCollectionNameByEntityType,
  getCollectionVendorByName,
  type CollectionVendor,
  type CollectionConfig,
} from "./config/collections.config";

export {
  type TextGenerationService,
  type ITextGenerationService,
  type GenerateOptions,
  type GenerateStreamOptions,
  TextGenerationError,
} from "./services/text-generation/text-generation.service";

export * from "./services/prompts/prompt-rewriter.service";
export {
  SuggestionService,
  getSuggestionService,
  type SuggestionContext,
  type Suggestion,
} from "./services/generation/suggestion.service";

export { type IEmbeddingsService, EmbeddingsService } from "./services/embeddings/embeddings.service";

export {
  OPTIMAL_CHUNK_SIZE,
  OPTIMAL_CHUNK_OVERLAP,
  type EmbeddingsConfig,
} from "./services/embeddings/embeddings.config";

export {
  SparseVectorService,
  getSparseVectorService,
  resetSparseVectorService,
  type ISparseVectorService,
  type SparseVector,
} from "./services/embeddings/sparse-vector.service";

export type { ChatMessage } from "./types/chat";
export { formatConversationHistory } from "./utils/chat.utils";
export type { Tool, ToolResult } from "./types/tools";
export { createTool, createSuccessResult, createErrorResult } from "./utils/tool.utils";
export type { ClientConfig, GenerationModelConfig, EmbeddingModelConfig, RAGConfig } from "./types/config";

export { convertToCoreTools } from "./tools/tool.converter";
export {
  createAllConnectorTools,
  createAllConnectorToolsWithMCP,
  createSpotifyTools,
  createAllMCPTools,
  createMCPToolsForVendor,
  getMCPToolsSummary,
} from "./tools/connectors.tools";
export type { SpotifySearchResult } from "./tools/domains/spotify.tools";
export type { ModelMetadata, ModelCapabilities, ModelParameters } from "./types/models/model.metadata";
export { getAllModels, getModelMetadata, MODEL_REGISTRY } from "./services/metadata/model-registry";

export {
  STREAM_EVENT,
  METADATA_TYPE,
  type StreamEvent,
  type RAGContextMetadata,
  type TaskStep,
  type ToolCallMetadata,
  type ReasoningStep,
  type SuggestionItem,
} from "./types";

export { initLangfuseProvider, resetLangfuseProvider, getLangfuseProvider } from "./telemetry/langfuse.provider";
export {
  createTraceContext,
  createChildContext,
  recordSpan,
  recordGeneration,
  createSpanWithTiming,
  updateTraceInput,
  endTraceWithOutput,
  endTraceWithError,
  shouldEnableTelemetry,
} from "./telemetry/telemetry.middleware";

export type { TraceContext, TelemetryConfig } from "./types/telemetry";

export { getAnalyticsService } from "./services/analytics/analytics.service";

export { smoothStream } from "./services/text-generation/utils/stream.utils";

export {
  type ICacheProvider,
  type ICacheService,
  getCacheService,
  setCacheProvider,
  resetCacheService,
  MemoryCacheProvider,
} from "./services/cache/cache.service";

export {
  SemanticCacheService,
  getSemanticCacheService,
  resetSemanticCacheService,
  type SemanticCacheConfig,
} from "./services/cache/semantic-cache.service";

export {
  RedisCacheProvider,
  createRedisCacheProvider,
  type RedisCacheConfig,
} from "./services/cache/redis-cache.provider";

// Insights services
export { InsightsService, getInsightsService, resetInsightsService } from "./services/insights/insights.service";
export {
  AnomalyDetectorService,
  getAnomalyDetectorService,
  resetAnomalyDetectorService,
} from "./services/insights/anomaly-detector.service";
export {
  CorrelationEngineService,
  getCorrelationEngineService,
  resetCorrelationEngineService,
} from "./services/insights/correlation-engine.service";
export {
  IntegrationRegistryService,
  getIntegrationRegistryService,
  resetIntegrationRegistryService,
} from "./services/insights/integration-registry.service";
export {
  ActivityAggregatorService,
  createActivityAggregatorService,
  type IConnectorServiceFactory,
} from "./services/insights/activity-aggregator.service";

// MCP (Model Context Protocol) - Enables write operations via vendor-hosted MCP servers
export {
  MCPClientManager,
  getMCPClientManager,
  resetMCPClientManager,
  MCP_SERVERS,
  getMCPServerConfig,
  getMCPVendors,
  hasMCPServer,
  type MCPVendor,
  type MCPTransport,
  type MCPServerConfig,
  type MCPClientState,
  type MCPTool,
  type MCPToolResult,
  type MCPToolCallRequest,
  type MCPClientInfo,
  type MCPConnectOptions,
  type MCPTokenProvider,
} from "./mcp";
