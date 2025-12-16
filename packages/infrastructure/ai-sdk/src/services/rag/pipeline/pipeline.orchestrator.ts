import { getLogger } from "@ait/core";
import type {
  IPipelineStage,
  PipelineConfig,
  PipelineContext,
  PipelineExecutionOptions,
  PipelineResult,
  StageResult,
} from "./pipeline.types";

const logger = getLogger();

export class PipelineOrchestrator<TInput = unknown, TOutput = unknown> {
  private readonly _stages: IPipelineStage<unknown, unknown>[];
  private readonly _failureMode: PipelineConfig["failureMode"];
  private readonly _enableTelemetry: boolean;

  constructor(config: PipelineConfig) {
    this._stages = config.stages;
    this._failureMode = config.failureMode;
    this._enableTelemetry = config.enableTelemetry;

    if (this._stages.length === 0) {
      throw new Error("Pipeline must have at least one stage");
    }
  }

  async execute(input: TInput, options: PipelineExecutionOptions = {}): Promise<PipelineResult<TOutput>> {
    const startTime = Date.now();
    const stageResults: StageResult[] = [];

    const context = this.createContext(options);

    let currentInput: unknown = input;
    let finalOutput: unknown = undefined;
    let pipelineError: Error | undefined;

    const skipStages = new Set(options.skipStages || []);

    for (const stage of this._stages) {
      if (skipStages.has(stage.name)) {
        this.logInfo(`⏭️ Skipping stage: ${stage.name}`);
        stageResults.push({
          stageName: stage.name,
          success: true,
          duration: 0,
          input: currentInput,
          output: currentInput,
        });
        continue;
      }

      const stageResult = await this.executeStage(stage, currentInput, context);
      stageResults.push(stageResult);

      if (!stageResult.success) {
        pipelineError = stageResult.error;

        if (this._failureMode === "fail-fast") {
          this.logError(`❌ Pipeline failed at stage: ${stage.name}`, stageResult.error!);
          break;
        }

        this.logWarn(`⚠️ Stage ${stage.name} failed, continuing pipeline`, {
          error: stageResult.error?.message,
        });

        if (stageResult.output !== undefined) {
          currentInput = stageResult.output;
        }
        continue;
      }

      currentInput = stageResult.output;
      finalOutput = stageResult.output;
    }

    const totalDuration = Date.now() - startTime;

    const result: PipelineResult<TOutput> = {
      success: !pipelineError || this._failureMode === "continue-on-error",
      data: finalOutput as TOutput,
      error: pipelineError,
      stageResults,
      totalDuration,
    };

    this.logInfo(
      `✅ Pipeline completed: ${stageResults.length} stages in ${totalDuration}ms (${stageResults.filter((s) => !s.success).length} failed)`,
    );

    return result;
  }

  private async executeStage(
    stage: IPipelineStage<unknown, unknown>,
    input: unknown,
    context: PipelineContext,
  ): Promise<StageResult> {
    const stageStartTime = Date.now();

    try {
      if (stage.canExecute) {
        const canExecute = await stage.canExecute(input, context);
        if (!canExecute) {
          this.logInfo(`⏭️ Stage ${stage.name} skipped (canExecute: false)`);
          return {
            stageName: stage.name,
            success: true,
            duration: Date.now() - stageStartTime,
            input,
            output: input,
          };
        }
      }

      this.logInfo(`🔄 ${stage.name}`);

      const output = await stage.execute(input, context);
      const duration = Date.now() - stageStartTime;

      if (this._enableTelemetry) {
        context.telemetry.recordStage(stage.name, input, output, duration);
      }

      this.logInfo(`   └─ Completed in ${duration}ms`);

      return {
        stageName: stage.name,
        success: true,
        duration,
        input,
        output,
      };
    } catch (error) {
      const duration = Date.now() - stageStartTime;
      const err = error instanceof Error ? error : new Error(String(error));

      this.logError(`❌ Stage ${stage.name} failed`, err);

      let recoveredOutput: unknown = undefined;
      if (stage.onError) {
        try {
          recoveredOutput = await stage.onError(err, context);
          this.logInfo("   └─ Recovered from error", {
            hasRecoveredOutput: recoveredOutput !== null,
          });
        } catch (recoveryError) {
          this.logError(`❌ Stage ${stage.name} error recovery failed`, recoveryError as Error);
        }
      }

      return {
        stageName: stage.name,
        success: false,
        duration,
        input,
        output: recoveredOutput,
        error: err,
      };
    }
  }

  private createContext(options: PipelineExecutionOptions): PipelineContext {
    const stageRecords: Array<{ name: string; input: unknown; output: unknown; duration: number }> = [];

    return {
      traceContext: options.traceContext,
      metadata: options.metadata || {},
      state: new Map<string, unknown>(),
      telemetry: {
        recordStage: (name: string, input: unknown, output: unknown, duration: number) => {
          stageRecords.push({ name, input, output, duration });
        },
      },
    };
  }

  private logInfo(message: string, data?: Record<string, unknown>): void {
    logger.info(`[PipelineOrchestrator] ${message}`, data || {});
  }

  private logWarn(message: string, data?: Record<string, unknown>): void {
    logger.warn(`[PipelineOrchestrator] ${message}`, data || {});
  }

  private logError(message: string, error: Error): void {
    logger.error(`[PipelineOrchestrator] ${message}`, {
      error: error.message,
      stack: error.stack,
    });
  }

  getStages(): ReadonlyArray<IPipelineStage<unknown, unknown>> {
    return this._stages;
  }
}
