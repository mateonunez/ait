import { PipelineBuilder } from "../services/rag/pipeline/pipeline.builder";
import type { PipelineOrchestrator } from "../services/rag/pipeline/pipeline.orchestrator";
import { ConversationProcessingStage } from "../stages/generation/conversation-processing.stage";
import { ContextPreparationStage } from "../stages/generation/context-preparation.stage";
import { ToolExecutionStage } from "../stages/generation/tool-execution.stage";
import { TextGenerationStage } from "../stages/generation/text-generation.stage";
import { MetadataExtractionStage } from "../stages/generation/metadata-extraction.stage";
import type { ConversationProcessingInput, MetadataExtractionOutput } from "../types/stages";
import type { ConversationConfig } from "../types/text-generation";

export interface GenerationPipelineConfig {
  conversationConfig?: ConversationConfig;
  enableTelemetry?: boolean;
}

export function createGenerationPipeline(
  config: GenerationPipelineConfig = {},
): PipelineOrchestrator<ConversationProcessingInput, MetadataExtractionOutput> {
  return PipelineBuilder.create<ConversationProcessingInput, MetadataExtractionOutput>()
    .addStage(new ConversationProcessingStage(config.conversationConfig))
    .addStage(new ContextPreparationStage())
    .addStage(new ToolExecutionStage())
    .addStage(new TextGenerationStage())
    .addStage(new MetadataExtractionStage())
    .withFailureMode("fail-fast")
    .withTelemetry(config.enableTelemetry ?? true)
    .build();
}
