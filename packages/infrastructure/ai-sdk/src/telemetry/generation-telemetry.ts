import type { ChatMessage } from "../types/chat";
import type { SpanMetadata, TraceContext } from "../types/telemetry";
import type { Tool } from "../types/tools";
import {
  createTraceContext,
  endTraceWithError,
  endTraceWithOutput,
  shouldEnableTelemetry,
  updateTraceInput,
} from "./telemetry.middleware";

export interface GenerationTelemetryOptions {
  name: string;
  enableTelemetry?: boolean;
  traceId?: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  metadata?: SpanMetadata;
}

export interface GenerationTelemetryInput {
  prompt?: string;
  messages?: ChatMessage[];
  enableRAG?: boolean;
  tools?: Record<string, Tool> | string[];
  maxToolRounds?: number;
  [key: string]: unknown;
}

export interface GenerationTelemetryOutput {
  response?: string;
  chunkCount?: number;
  responseLength?: number;
  duration?: number;
  [key: string]: unknown;
}

export interface GenerationTelemetryErrorMetadata {
  errorCategory?: string;
  errorSeverity?: string;
  errorFingerprint?: string;
  isRetryable?: boolean;
  suggestedAction?: string;
  [key: string]: unknown;
}

export class GenerationTelemetryContext {
  private readonly _enabled: boolean;
  private readonly _traceContext: TraceContext | null;
  private readonly _startTime: number;

  constructor(options: GenerationTelemetryOptions) {
    this._startTime = Date.now();
    this._enabled = shouldEnableTelemetry({ enableTelemetry: options.enableTelemetry });

    if (this._enabled) {
      this._traceContext = createTraceContext(
        options.name,
        {
          userId: options.userId,
          sessionId: options.sessionId,
          tags: options.tags,
          ...options.metadata,
        },
        options.traceId,
      );
    } else {
      this._traceContext = null;
    }
  }

  get isEnabled(): boolean {
    return this._enabled && this._traceContext !== null;
  }

  get traceContext(): TraceContext | null {
    return this._traceContext;
  }

  get optionalContext(): TraceContext | undefined {
    return this._traceContext || undefined;
  }

  recordInput(input: GenerationTelemetryInput): void {
    if (!this._traceContext) return;

    const sanitizedInput: Record<string, unknown> = { ...input };
    if (input.tools && typeof input.tools === "object" && !Array.isArray(input.tools)) {
      sanitizedInput.tools = Object.keys(input.tools);
    }

    updateTraceInput(this._traceContext, sanitizedInput);
  }

  recordSuccess(output: GenerationTelemetryOutput): void {
    if (!this._traceContext) return;

    const duration = Date.now() - this._startTime;
    endTraceWithOutput(this._traceContext, {
      ...output,
      duration,
    });
  }

  recordError(error: unknown, metadata?: GenerationTelemetryErrorMetadata): void {
    if (!this._traceContext) return;

    endTraceWithError(this._traceContext, error, metadata);
  }

  getDuration(): number {
    return Date.now() - this._startTime;
  }
}

export function createGenerationTelemetry(options: GenerationTelemetryOptions): GenerationTelemetryContext {
  return new GenerationTelemetryContext(options);
}
