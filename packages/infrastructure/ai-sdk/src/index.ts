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

export { getOllamaProvider } from "./client/ai-sdk-ollama.provider";

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

export { type IEmbeddingsService, EmbeddingsService } from "./services/embeddings/embeddings.service";

export { type ChatMessage, type MessageRole, formatConversationHistory } from "./types/chat";
export { type Tool, type ToolResult, createTool, createSuccessResult, createErrorResult } from "./types/tools";
export type { ClientConfig, GenerationModelConfig, EmbeddingModelConfig, RAGConfig } from "./types/config";

export { convertToOllamaTools } from "./tools/tool.converter";
export { createAllConnectorTools, createSpotifyTools } from "./tools/connectors.tools";
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
  updateTraceInput,
  endTraceWithOutput,
  endTraceWithError,
  shouldEnableTelemetry,
} from "./telemetry/telemetry.middleware";
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
