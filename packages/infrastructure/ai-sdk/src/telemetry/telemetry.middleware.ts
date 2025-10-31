import { randomUUID } from "node:crypto";
import { getLangfuseProvider } from "./langfuse.provider";
import type { TraceContext, SpanMetadata, SpanInput, SpanOutput, SpanType, TelemetryOptions } from "../types/telemetry";

export interface WithTelemetryOptions<T = unknown> {
  name: string;
  type: SpanType;
  traceContext?: TraceContext;
  metadata?: SpanMetadata;
  extractInput?: (args: T) => SpanInput;
  extractOutput?: (result: unknown) => SpanOutput;
}

export async function withTelemetry<TArgs = unknown, TResult = unknown>(
  options: WithTelemetryOptions<TArgs>,
  fn: (args: TArgs) => Promise<TResult>,
  args: TArgs,
): Promise<TResult> {
  const provider = getLangfuseProvider();

  if (!provider || !provider.isEnabled()) {
    return fn(args);
  }

  const spanId = randomUUID();
  let traceContext = options.traceContext;

  if (!traceContext) {
    const traceId = randomUUID();
    traceContext = provider.createTrace(options.name, traceId, options.metadata) || undefined;
  }

  if (!traceContext) {
    return fn(args);
  }

  const createdSpanId = provider.createSpan(options.name, spanId, traceContext, options.type, options.metadata);

  if (!createdSpanId) {
    return fn(args);
  }

  const input = options.extractInput ? options.extractInput(args) : {};
  provider.updateSpan(createdSpanId, input);

  const startTime = Date.now();

  try {
    const result = await fn(args);
    const endTime = Date.now();

    const output = options.extractOutput ? options.extractOutput(result) : {};
    provider.updateSpan(createdSpanId, undefined, {
      ...output,
      duration: endTime - startTime,
    });

    provider.endSpan(createdSpanId, output);

    return result;
  } catch (error) {
    provider.endSpan(createdSpanId, undefined, error instanceof Error ? error : String(error));
    throw error;
  }
}

export async function* withTelemetryStream<TArgs = unknown, TChunk = unknown>(
  options: WithTelemetryOptions<TArgs>,
  fn: (args: TArgs) => AsyncGenerator<TChunk>,
  args: TArgs,
): AsyncGenerator<TChunk> {
  const provider = getLangfuseProvider();

  if (!provider || !provider.isEnabled()) {
    yield* fn(args);
    return;
  }

  const spanId = randomUUID();
  let traceContext = options.traceContext;

  if (!traceContext) {
    const traceId = randomUUID();
    traceContext = provider.createTrace(options.name, traceId, options.metadata) || undefined;
  }

  if (!traceContext) {
    yield* fn(args);
    return;
  }

  const createdSpanId = provider.createSpan(options.name, spanId, traceContext, options.type, options.metadata);

  if (!createdSpanId) {
    yield* fn(args);
    return;
  }

  const input = options.extractInput ? options.extractInput(args) : {};
  provider.updateSpan(createdSpanId, input);

  const startTime = Date.now();
  const chunks: TChunk[] = [];

  try {
    for await (const chunk of fn(args)) {
      chunks.push(chunk);
      yield chunk;
    }

    const endTime = Date.now();
    const output = options.extractOutput ? options.extractOutput(chunks) : { chunks: chunks.length };

    provider.updateSpan(createdSpanId, undefined, {
      ...output,
      duration: endTime - startTime,
    });

    provider.endSpan(createdSpanId, output);
  } catch (error) {
    provider.endSpan(createdSpanId, undefined, error instanceof Error ? error : String(error));
    throw error;
  }
}

export function createTraceContext(name: string, metadata?: SpanMetadata): TraceContext | null {
  const provider = getLangfuseProvider();

  if (!provider || !provider.isEnabled()) {
    return null;
  }

  const traceId = randomUUID();
  return provider.createTrace(name, traceId, metadata);
}

export function recordSpan(
  name: string,
  type: SpanType,
  traceContext: TraceContext,
  input?: SpanInput,
  output?: SpanOutput,
  metadata?: SpanMetadata,
): void {
  const provider = getLangfuseProvider();

  if (!provider || !provider.isEnabled()) {
    return;
  }

  const spanId = randomUUID();
  const createdSpanId = provider.createSpan(name, spanId, traceContext, type, metadata);

  if (!createdSpanId) {
    return;
  }

  if (input) {
    provider.updateSpan(createdSpanId, input);
  }

  if (output) {
    provider.updateSpan(createdSpanId, undefined, output);
  }

  provider.endSpan(createdSpanId, output);
}

export function shouldEnableTelemetry(options?: TelemetryOptions): boolean {
  if (options?.enableTelemetry !== true) {
    return false;
  }

  const provider = getLangfuseProvider();
  return provider?.isEnabled() ?? false;
}

/**
 * Update trace with input data
 */
export function updateTraceInput(traceContext: TraceContext, input: SpanInput): void {
  const provider = getLangfuseProvider();

  if (!provider || !provider.isEnabled()) {
    return;
  }

  provider.updateTraceInput(traceContext.traceId, input);
}

/**
 * Update trace with output data
 */
export function updateTraceOutput(traceContext: TraceContext, output: SpanOutput): void {
  const provider = getLangfuseProvider();

  if (!provider || !provider.isEnabled()) {
    return;
  }

  provider.updateTraceOutput(traceContext.traceId, output);
}

/**
 * End trace with output data
 */
export function endTraceWithOutput(traceContext: TraceContext, output: SpanOutput): void {
  const provider = getLangfuseProvider();

  if (!provider || !provider.isEnabled()) {
    return;
  }

  provider.endTrace(traceContext.traceId, output);
}

/**
 * End trace with error
 */
export function endTraceWithError(traceContext: TraceContext, error: unknown): void {
  const provider = getLangfuseProvider();

  if (!provider || !provider.isEnabled()) {
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  provider.endTrace(traceContext.traceId, undefined, err);
}

/**
 * Record a generation observation (for LLM calls)
 */
export function recordGeneration(
  traceContext: TraceContext,
  name: string,
  input: SpanInput,
  output?: SpanOutput,
  metadata?: SpanMetadata,
): void {
  const provider = getLangfuseProvider();

  if (!provider || !provider.isEnabled()) {
    return;
  }

  const spanId = randomUUID();
  const createdSpanId = provider.createSpan(name, spanId, traceContext, "generation", metadata);

  if (!createdSpanId) {
    return;
  }

  provider.recordGeneration(createdSpanId, name, input, output, metadata);
}
