import { getLogger } from "@ait/core";
import { recordSpan } from "../../../telemetry/telemetry.middleware";
import type { IPipelineStage, PipelineContext } from "./pipeline.types";

const logger = getLogger();

export abstract class PipelineStageAbstract<TInput = unknown, TOutput = unknown>
  implements IPipelineStage<TInput, TOutput>
{
  abstract readonly name: string;

  protected recordTelemetry(
    stageName: string,
    input: unknown,
    output: unknown,
    duration: number,
    context: PipelineContext,
  ): void {
    if (context.traceContext) {
      recordSpan(
        `stage-${stageName}`,
        "pipeline",
        context.traceContext,
        { stageName, input: this.sanitizeForTelemetry(input) },
        {
          output: this.sanitizeForTelemetry(output),
          duration,
        },
      );
    }

    context.telemetry.recordStage(stageName, input, output, duration);
  }

  protected sanitizeForTelemetry(data: unknown): unknown {
    if (typeof data === "string" && data.length > 500) {
      return `${data.slice(0, 500)}... (truncated)`;
    }
    if (Array.isArray(data) && data.length > 10) {
      return {
        type: "array",
        length: data.length,
        sample: data.slice(0, 3),
      };
    }
    return data;
  }

  protected setState<T>(context: PipelineContext, key: string, value: T): void {
    context.state.set(key, value);
  }

  protected getState<T>(context: PipelineContext, key: string): T | undefined {
    return context.state.get(key) as T | undefined;
  }

  protected logInfo(message: string, data?: Record<string, unknown>): void {
    logger.info(`[Pipeline:${this.name}] ${message}`, data || {});
  }

  protected logWarn(message: string, data?: Record<string, unknown>): void {
    logger.warn(`[Pipeline:${this.name}] ${message}`, data || {});
  }

  protected logError(message: string, error: Error, data?: Record<string, unknown>): void {
    logger.error(`[Pipeline:${this.name}] ${message}`, {
      error: error.message,
      stack: error.stack,
      ...data,
    });
  }

  protected validateInput(input: TInput, context: PipelineContext): void {
    if (input === null || input === undefined) {
      throw new Error(`[${this.name}] Input cannot be null or undefined`);
    }
  }

  async canExecute?(input: TInput, context: PipelineContext): Promise<boolean>;

  async onError?(error: Error, context: PipelineContext): Promise<TOutput | null>;

  abstract execute(input: TInput, context: PipelineContext): Promise<TOutput>;
}
