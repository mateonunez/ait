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
  type LlmGenerateTextOptions,
  type LlmStreamOptions,
  type LlmStructuredGenerationOptions,
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

export * from "./services/generation/query-rewriter.service";
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

export type { ChatMessage, MessageRole } from "./types/chat";
export { formatConversationHistory } from "./utils/chat.utils";
export type { Tool, ToolResult } from "./types/tools";
export { createTool, createSuccessResult, createErrorResult } from "./utils/tool.utils";
export type { ClientConfig, GenerationModelConfig, EmbeddingModelConfig, RAGConfig } from "./types/config";

export { convertToOllamaTools } from "./tools/tool.converter";
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

export { createRAGPipeline, type RAGPipelineConfig } from "./pipelines/rag.pipeline";
export { createGenerationPipeline, type GenerationPipelineConfig } from "./pipelines/generation.pipeline";
export { createCompletePipeline, type CompletePipelineConfig } from "./pipelines/complete.pipeline";

export { PipelineBuilder } from "./services/rag/pipeline/pipeline.builder";
export { PipelineOrchestrator } from "./services/rag/pipeline/pipeline.orchestrator";
export type {
  IPipelineStage,
  PipelineConfig,
  PipelineContext,
  PipelineResult,
  StageResult,
  PipelineExecutionOptions,
  FailureMode,
} from "./services/rag/pipeline/pipeline.types";

export { initLangfuseProvider, resetLangfuseProvider, getLangfuseProvider } from "./telemetry/langfuse.provider";
export {
  createTraceContext,
  recordSpan,
  recordGeneration,
  createSpanWithTiming,
  updateTraceInput,
  endTraceWithOutput,
  endTraceWithError,
  shouldEnableTelemetry,
} from "./telemetry/telemetry.middleware";

export {
  FastQueryAnalyzerService,
  getFastQueryAnalyzer,
  type FastQueryAnalysis,
  type IFastQueryAnalyzerService,
} from "./services/routing/fast-query-analyzer.service";

export {
  CollectionRouterService,
  type ICollectionRouterService,
  type CollectionRouterConfig,
} from "./services/routing/collection-router.service";

export {
  QueryIntentService,
  type IQueryIntentService,
  type QueryIntent,
} from "./services/routing/query-intent.service";

// Ranking services
export {
  FastRerankService,
  getFastRerankService,
  resetFastRerankService,
  type FastRerankConfig,
} from "./services/ranking/fast-rerank.service";

export {
  RerankService,
  type IRerankService,
} from "./services/ranking/rerank.service";

export {
  CollectionRerankService,
  type ICollectionRerankService,
} from "./services/ranking/collection-rerank.service";

export type { RerankingStageConfig } from "./stages/rag/reranking.stage";
export type { TraceContext, TelemetryConfig } from "./types/telemetry";

export { getAnalyticsService } from "./services/analytics/analytics.service";

export { getModelInfoService, type IModelInfoService } from "./services/metadata/model-info.service";

export { getFeedbackService, resetFeedbackService, FeedbackService } from "./services/feedback/feedback.service";
export type {
  Feedback,
  FeedbackRating,
  FeedbackStats,
  FeedbackMetadata,
  QualityTrendPoint,
  ProblematicTrace,
} from "./services/feedback/types";

export { smoothStream } from "./services/text-generation/utils/stream.utils";

export {
  type ICacheProvider,
  type ICacheService,
  getCacheService,
  setCacheProvider,
  resetCacheService,
  MemoryCacheProvider,
} from "./services/cache/cache.service";

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
  GoalTrackingService,
  getGoalTrackingService,
  resetGoalTrackingService,
} from "./services/insights/goal-tracking.service";
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

// Insights types
export type {
  InsightsData,
  InsightSummary,
  InsightCorrelation,
  InsightAnomaly,
  InsightRecommendation,
  Insight,
  InsightType,
  GoalData,
  GoalType,
  GoalPeriod,
  CreateGoalRequest,
  UpdateGoalRequest,
  ActivityData,
  InsightsConfig,
} from "./services/insights/insights.types";

export { DEFAULT_INSIGHTS_CONFIG } from "./services/insights/insights.types";

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
