import { PipelineOrchestrator } from "./pipeline.orchestrator";
import type { FailureMode, IPipelineStage, PipelineConfig } from "./pipeline.types";

export class PipelineBuilder<TInput = unknown, TOutput = unknown> {
  private _stages: IPipelineStage<unknown, unknown>[] = [];
  private _failureMode: FailureMode = "fail-fast";
  private _enableTelemetry = true;

  static create<TInput = unknown, TOutput = unknown>(): PipelineBuilder<TInput, TOutput> {
    return new PipelineBuilder<TInput, TOutput>();
  }

  addStage<TStageInput = unknown, TStageOutput = unknown>(
    stage: IPipelineStage<TStageInput, TStageOutput>,
  ): PipelineBuilder<TInput, TOutput> {
    this._stages.push(stage as IPipelineStage<unknown, unknown>);
    return this;
  }

  withFailureMode(mode: FailureMode): PipelineBuilder<TInput, TOutput> {
    this._failureMode = mode;
    return this;
  }

  withTelemetry(enabled: boolean): PipelineBuilder<TInput, TOutput> {
    this._enableTelemetry = enabled;
    return this;
  }

  build(): PipelineOrchestrator<TInput, TOutput> {
    this.validate();

    const config: PipelineConfig = {
      stages: this._stages,
      failureMode: this._failureMode,
      enableTelemetry: this._enableTelemetry,
    };

    return new PipelineOrchestrator<TInput, TOutput>(config);
  }

  private validate(): void {
    if (this._stages.length === 0) {
      throw new Error("Pipeline must have at least one stage");
    }

    const stageNames = this._stages.map((s) => s.name);
    const duplicates = stageNames.filter((name, index) => stageNames.indexOf(name) !== index);

    if (duplicates.length > 0) {
      throw new Error(`Duplicate stage names found: ${duplicates.join(", ")}`);
    }
  }
}

export function createPipelineFromConfig<TInput = unknown, TOutput = unknown>(
  config: PipelineConfig,
): PipelineOrchestrator<TInput, TOutput> {
  return new PipelineOrchestrator<TInput, TOutput>(config);
}

export const PIPELINE_PRESETS = {
  MULTI_COLLECTION_RAG: "multi-collection-rag",
  SIMPLE_SEARCH: "simple-search",
  TEMPORAL_CORRELATION: "temporal-correlation",
} as const;

export type PipelinePreset = (typeof PIPELINE_PRESETS)[keyof typeof PIPELINE_PRESETS];
