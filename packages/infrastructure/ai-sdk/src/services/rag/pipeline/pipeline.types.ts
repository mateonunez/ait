import type { TraceContext } from "../../../types/telemetry";

export type FailureMode = "fail-fast" | "continue-on-error";

export interface PipelineContext {
  traceContext?: TraceContext;
  metadata: Record<string, unknown>;
  state: Map<string, unknown>;
  telemetry: {
    recordStage(name: string, input: unknown, output: unknown, duration: number): void;
  };
}

export interface IPipelineStage<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  execute(input: TInput, context: PipelineContext): Promise<TOutput>;
  canExecute?(input: TInput, context: PipelineContext): Promise<boolean>;
  onError?(error: Error, context: PipelineContext): Promise<TOutput | null>;
}

export interface PipelineConfig {
  stages: IPipelineStage<unknown, unknown>[];
  failureMode: FailureMode;
  enableTelemetry: boolean;
}

export interface PipelineResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  stageResults: StageResult[];
  totalDuration: number;
}

export interface StageResult {
  stageName: string;
  success: boolean;
  duration: number;
  input?: unknown;
  output?: unknown;
  error?: Error;
}

export interface PipelineExecutionOptions {
  skipStages?: string[];
  metadata?: Record<string, unknown>;
  traceContext?: TraceContext;
}
