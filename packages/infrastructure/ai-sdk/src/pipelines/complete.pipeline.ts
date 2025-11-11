import { createRAGPipeline, type RAGPipelineConfig } from "./rag.pipeline";
import { createGenerationPipeline, type GenerationPipelineConfig } from "./generation.pipeline";
import type { PipelineOrchestrator } from "../services/rag/pipeline/pipeline.orchestrator";

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
