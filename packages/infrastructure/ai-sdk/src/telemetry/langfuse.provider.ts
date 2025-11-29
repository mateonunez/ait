import { Langfuse } from "langfuse";
import type {
  TelemetryConfig,
  TraceContext,
  SpanMetadata,
  SpanInput,
  SpanOutput,
  SpanType,
  SpanEvent,
} from "../types/telemetry";
import { getLogger } from "@ait/core";

const logger = getLogger();

interface TraceState {
  trace: any;
  hasInput: boolean;
  hasOutput: boolean;
  isComplete: boolean;
  createdAt: number;
  spanCount: number;
}

interface SpanState {
  span: any;
  startTime: Date;
}

export class LangfuseProvider {
  private client: Langfuse | null = null;
  private config: Required<TelemetryConfig>;
  private activeTraces = new Map<string, TraceState>();
  private activeSpans = new Map<string, SpanState>();
  private flushRetries = 3;
  private flushTimeout = 10000; // 10 seconds

  constructor(config?: TelemetryConfig) {
    const enabled = config?.enabled ?? process.env.LANGFUSE_ENABLED === "true";
    const publicKey = config?.publicKey ?? process.env.LANGFUSE_PUBLIC_KEY ?? "";
    const secretKey = config?.secretKey ?? process.env.LANGFUSE_SECRET_KEY ?? "";
    const baseURL = config?.baseURL ?? process.env.LANGFUSE_BASEURL ?? "https://localhost:3000";

    this.config = {
      enabled,
      publicKey,
      secretKey,
      baseURL,
      flushAt: config?.flushAt ?? 1,
      flushInterval: config?.flushInterval ?? 1000,
    };

    if (this.config.enabled && this.config.publicKey && this.config.secretKey) {
      try {
        this.client = new Langfuse({
          publicKey: this.config.publicKey,
          secretKey: this.config.secretKey,
          baseUrl: this.config.baseURL,
          flushAt: this.config.flushAt,
          flushInterval: this.config.flushInterval,
        });
      } catch (error) {
        logger.warn("[Langfuse] Failed to initialize client:", { error });
        this.config.enabled = false;
      }
    } else {
      if (this.config.enabled) {
        logger.warn("[Langfuse] Telemetry enabled but missing credentials", {
          hasPublicKey: !!this.config.publicKey,
          hasSecretKey: !!this.config.secretKey,
        });
      }
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && this.client !== null;
  }

  createTrace(name: string, traceId: string, metadata?: SpanMetadata): TraceContext | null {
    if (!this.isEnabled() || !this.client) {
      return null;
    }

    try {
      const trace = this.client.trace({
        id: traceId,
        name,
        userId: metadata?.userId,
        sessionId: metadata?.sessionId,
        tags: metadata?.tags,
        metadata: metadata as Record<string, unknown>,
      });

      this.activeTraces.set(traceId, {
        trace,
        hasInput: false,
        hasOutput: false,
        isComplete: false,
        createdAt: Date.now(),
        spanCount: 0,
      });

      return {
        traceId,
        metadata,
      };
    } catch (error) {
      logger.warn("[Langfuse] Failed to create trace:", { error });
      return null;
    }
  }

  createSpan(
    name: string,
    spanId: string,
    traceContext: TraceContext,
    type: SpanType = "generation",
    metadata?: SpanMetadata,
  ): string | null {
    if (!this.isEnabled() || !this.client) {
      return null;
    }

    try {
      const traceState = this.activeTraces.get(traceContext.traceId);
      if (!traceState) {
        logger.warn(`Trace ${traceContext.traceId} not found for span ${spanId}`);
        return null;
      }

      const startTime = new Date();
      const span = traceState.trace.span({
        id: spanId,
        name,
        startTime,
        metadata: {
          type,
          ...metadata,
        } as Record<string, unknown>,
      });

      this.activeSpans.set(spanId, { span, startTime });
      traceState.spanCount++;

      return spanId;
    } catch (error) {
      logger.warn("Failed to create span:", { error });
      return null;
    }
  }

  updateSpan(spanId: string, input?: SpanInput, output?: SpanOutput, metadata?: SpanMetadata): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const spanState = this.activeSpans.get(spanId);
      if (!spanState) {
        return;
      }

      const { span } = spanState;

      if (input) {
        span.update({
          input: input as Record<string, unknown>,
        });
      }

      if (output) {
        span.update({
          output: output as Record<string, unknown>,
        });
      }

      if (metadata) {
        span.update({
          metadata: metadata as Record<string, unknown>,
        });
      }
    } catch (error) {
      logger.warn("Failed to update span:", { error });
    }
  }

  endSpan(spanId: string, output?: SpanOutput, error?: Error | string, errorMetadata?: SpanMetadata): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const spanState = this.activeSpans.get(spanId);
      if (!spanState) {
        return;
      }

      const { span } = spanState;
      const endTime = new Date();

      if (output) {
        span.update({
          output: output as Record<string, unknown>,
          endTime,
        });
      }

      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        span.update({
          level: "ERROR",
          statusMessage: errorMessage,
          endTime,
          metadata: {
            errorStack: errorStack?.split("\n").slice(0, 5).join("\n"),
            errorCategory: errorMetadata?.errorCategory,
            errorSeverity: errorMetadata?.errorSeverity,
            errorFingerprint: errorMetadata?.errorFingerprint,
            isRetryable: errorMetadata?.isRetryable,
            suggestedAction: errorMetadata?.suggestedAction,
          } as Record<string, unknown>,
        });
      }

      // End span with explicit endTime for accurate duration
      span.end({ endTime });
      this.activeSpans.delete(spanId);
    } catch (error) {
      logger.warn("Failed to end span:", { error });
    }
  }

  updateTraceInput(traceId: string, input: SpanInput): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const traceState = this.activeTraces.get(traceId);
      if (!traceState) {
        logger.warn(`[Langfuse] Trace ${traceId} not found for input update`);
        return;
      }

      traceState.trace.update({
        input: input as Record<string, unknown>,
      });
      traceState.hasInput = true;
    } catch (error) {
      logger.warn("[Langfuse] Failed to update trace input:", { error });
    }
  }

  updateTraceOutput(traceId: string, output: SpanOutput): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const traceState = this.activeTraces.get(traceId);
      if (!traceState) {
        logger.warn(`[Langfuse] Trace ${traceId} not found for output update`);
        return;
      }

      traceState.trace.update({
        output: output as Record<string, unknown>,
      });
      traceState.hasOutput = true;
    } catch (error) {
      logger.warn("[Langfuse] Failed to update trace output:", { error });
    }
  }

  endTrace(traceId: string, output?: SpanOutput, error?: Error, errorMetadata?: SpanMetadata): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const traceState = this.activeTraces.get(traceId);
      if (!traceState) {
        logger.warn(`[Langfuse] Trace ${traceId} not found for ending`);
        return;
      }

      if (output) {
        traceState.trace.update({
          output: output as Record<string, unknown>,
        });
        traceState.hasOutput = true;
      }

      if (error) {
        traceState.trace.update({
          level: "ERROR",
          statusMessage: error.message,
          metadata: {
            errorStack: error.stack?.split("\n").slice(0, 5).join("\n"),
            errorCategory: errorMetadata?.errorCategory,
            errorSeverity: errorMetadata?.errorSeverity,
            errorFingerprint: errorMetadata?.errorFingerprint,
            isRetryable: errorMetadata?.isRetryable,
            suggestedAction: errorMetadata?.suggestedAction,
          } as Record<string, unknown>,
        });
      }

      traceState.isComplete = true;
    } catch (error) {
      logger.warn("[Langfuse] Failed to end trace:", { error });
    }
  }

  recordEvent(spanId: string, event: SpanEvent): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const spanState = this.activeSpans.get(spanId);
      if (!spanState) {
        return;
      }

      spanState.span.event({
        name: event.name,
        metadata: {
          type: event.type,
          input: event.input,
          output: event.output,
          ...event.metadata,
        } as Record<string, unknown>,
      });
    } catch (error) {
      logger.warn("Failed to record event:", { error });
    }
  }

  recordGeneration(spanId: string, name: string, input: SpanInput, output?: SpanOutput, metadata?: SpanMetadata): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const spanState = this.activeSpans.get(spanId);
      if (!spanState) {
        return;
      }

      spanState.span.generation({
        name,
        input: input as Record<string, unknown>,
        output: output as Record<string, unknown>,
        model: metadata?.model,
        modelParameters: {
          temperature: metadata?.temperature,
          maxTokens: metadata?.maxTokens,
          topP: metadata?.topP,
          topK: metadata?.topK,
        },
        metadata: metadata as Record<string, unknown>,
      });
    } catch (error) {
      logger.warn("Failed to record generation:", { error });
    }
  }

  /**
   * Validate trace state before flush
   */
  private validateTraces(): { valid: number; invalid: number; warnings: string[] } {
    const warnings: string[] = [];
    let valid = 0;
    let invalid = 0;

    for (const [traceId, state] of this.activeTraces.entries()) {
      if (!state.isComplete) {
        warnings.push(`Trace ${traceId} is not marked complete`);
        invalid++;
        continue;
      }

      if (!state.hasInput) {
        warnings.push(`Trace ${traceId} missing input data`);
        invalid++;
        continue;
      }

      if (!state.hasOutput) {
        warnings.push(`Trace ${traceId} missing output data`);
        invalid++;
        continue;
      }

      valid++;
    }

    return { valid, invalid, warnings };
  }

  /**
   * Flush with retry logic and exponential backoff
   */
  async flush(): Promise<void> {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    // Validate traces before flush
    const validation = this.validateTraces();

    if (validation.warnings.length > 0) {
      logger.warn("[Langfuse] Trace validation warnings:", { warnings: validation.warnings });
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.flushRetries; attempt++) {
      try {
        // Use Promise.race to enforce timeout
        await Promise.race([
          this.client.flushAsync(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Flush timeout")), this.flushTimeout)),
        ]);

        // Clear completed traces after successful flush
        for (const [traceId, state] of this.activeTraces.entries()) {
          if (state.isComplete) {
            this.activeTraces.delete(traceId);
          }
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`[Langfuse] Flush attempt ${attempt} failed:`, { error: lastError.message });

        if (attempt < this.flushRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          const backoffMs = 100 * 2 ** (attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    logger.error("[Langfuse] Failed to flush after all retries:", { error: lastError?.message });
  }

  async shutdown(): Promise<void> {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      await this.client.shutdownAsync();
      this.activeTraces.clear();
      this.activeSpans.clear();
      this.client = null;
    } catch (error) {
      logger.warn("Failed to shutdown Langfuse client:", { error });
    }
  }
}

let _langfuseInstance: LangfuseProvider | null = null;

export function initLangfuseProvider(config?: TelemetryConfig): LangfuseProvider {
  _langfuseInstance = new LangfuseProvider(config);
  return _langfuseInstance;
}

export function getLangfuseProvider(): LangfuseProvider | null {
  return _langfuseInstance;
}

export function resetLangfuseProvider(): void {
  _langfuseInstance = null;
}
