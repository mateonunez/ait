import type { PipelineOrchestrator } from "../services/rag/pipeline/pipeline.orchestrator";
import { type GenerationPipelineConfig, createGenerationPipeline } from "./generation.pipeline";
import { type RAGPipelineConfig, createRAGPipeline } from "./rag.pipeline";

export interface CompletePipelineConfig {
  rag?: RAGPipelineConfig;
  generation?: GenerationPipelineConfig;
}

export function createCompletePipeline(config: CompletePipelineConfig = {}): {
  ragPipeline: PipelineOrchestrator<unknown, unknown>;
  generationPipeline: PipelineOrchestrator<unknown, unknown>;
} {
  const ragPipeline = createRAGPipeline(config.rag);
  const generationPipeline = createGenerationPipeline(config.generation);

  return {
    ragPipeline,
    generationPipeline,
  };
}
