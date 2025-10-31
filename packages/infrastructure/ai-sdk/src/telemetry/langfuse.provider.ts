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

export class LangfuseProvider {
  private client: Langfuse | null = null;
  private config: Required<TelemetryConfig>;
  private activeTraces: Map<string, any> = new Map();
  private activeSpans: Map<string, any> = new Map();

  constructor(config?: TelemetryConfig) {
    const enabled = config?.enabled ?? process.env.LANGFUSE_ENABLED === "true";
    const publicKey = config?.publicKey ?? process.env.LANGFUSE_PUBLIC_KEY ?? "";
    const secretKey = config?.secretKey ?? process.env.LANGFUSE_SECRET_KEY ?? "";
    const baseURL = config?.baseURL ?? process.env.LANGFUSE_BASEURL ?? "http://localhost:3000";

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
        console.log("[Langfuse] Client initialized successfully", {
          baseUrl: this.config.baseURL,
          flushAt: this.config.flushAt,
          flushInterval: this.config.flushInterval,
        });
      } catch (error) {
        console.warn("[Langfuse] Failed to initialize client:", error);
        this.config.enabled = false;
      }
    } else {
      if (this.config.enabled) {
        console.warn("[Langfuse] Telemetry enabled but missing credentials", {
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

      this.activeTraces.set(traceId, trace);

      console.log("[Langfuse] Trace created", {
        traceId,
        name,
        userId: metadata?.userId,
        sessionId: metadata?.sessionId,
        tags: metadata?.tags,
      });

      return {
        traceId,
        metadata,
      };
    } catch (error) {
      console.warn("[Langfuse] Failed to create trace:", error);
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
      const trace = this.activeTraces.get(traceContext.traceId);
      if (!trace) {
        console.warn(`Trace ${traceContext.traceId} not found for span ${spanId}`);
        return null;
      }

      const span = trace.span({
        id: spanId,
        name,
        metadata: {
          type,
          ...metadata,
        } as Record<string, unknown>,
      });

      this.activeSpans.set(spanId, span);

      return spanId;
    } catch (error) {
      console.warn("Failed to create span:", error);
      return null;
    }
  }

  updateSpan(spanId: string, input?: SpanInput, output?: SpanOutput, metadata?: SpanMetadata): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const span = this.activeSpans.get(spanId);
      if (!span) {
        return;
      }

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
      console.warn("Failed to update span:", error);
    }
  }

  endSpan(spanId: string, output?: SpanOutput, error?: Error | string): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const span = this.activeSpans.get(spanId);
      if (!span) {
        return;
      }

      if (output) {
        span.update({
          output: output as Record<string, unknown>,
        });
      }

      if (error) {
        span.update({
          level: "ERROR",
          statusMessage: error instanceof Error ? error.message : String(error),
        });
      }

      span.end();
      this.activeSpans.delete(spanId);
    } catch (err) {
      console.warn("Failed to end span:", err);
    }
  }

  updateTraceInput(traceId: string, input: SpanInput): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const trace = this.activeTraces.get(traceId);
      if (!trace) {
        console.warn(`[Langfuse] Trace ${traceId} not found for input update`);
        return;
      }

      trace.update({
        input: input as Record<string, unknown>,
      });

      console.log("[Langfuse] Trace input updated", { traceId });
    } catch (error) {
      console.warn("[Langfuse] Failed to update trace input:", error);
    }
  }

  updateTraceOutput(traceId: string, output: SpanOutput): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const trace = this.activeTraces.get(traceId);
      if (!trace) {
        console.warn(`[Langfuse] Trace ${traceId} not found for output update`);
        return;
      }

      trace.update({
        output: output as Record<string, unknown>,
      });

      console.log("[Langfuse] Trace output updated", { traceId });
    } catch (error) {
      console.warn("[Langfuse] Failed to update trace output:", error);
    }
  }

  endTrace(traceId: string, output?: SpanOutput, error?: Error): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const trace = this.activeTraces.get(traceId);
      if (!trace) {
        console.warn(`[Langfuse] Trace ${traceId} not found for ending`);
        return;
      }

      if (output) {
        trace.update({
          output: output as Record<string, unknown>,
        });
      }

      if (error) {
        trace.update({
          level: "ERROR",
          statusMessage: error.message,
        });
      }

      this.activeTraces.delete(traceId);
      console.log("[Langfuse] Trace ended", { traceId, hasError: !!error });
    } catch (err) {
      console.warn("[Langfuse] Failed to end trace:", err);
    }
  }

  recordEvent(spanId: string, event: SpanEvent): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const span = this.activeSpans.get(spanId);
      if (!span) {
        return;
      }

      span.event({
        name: event.name,
        metadata: {
          type: event.type,
          input: event.input,
          output: event.output,
          ...event.metadata,
        } as Record<string, unknown>,
      });
    } catch (error) {
      console.warn("Failed to record event:", error);
    }
  }

  recordGeneration(spanId: string, name: string, input: SpanInput, output?: SpanOutput, metadata?: SpanMetadata): void {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      const span = this.activeSpans.get(spanId);
      if (!span) {
        return;
      }

      span.generation({
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
      console.warn("Failed to record generation:", error);
    }
  }

  async flush(): Promise<void> {
    if (!this.isEnabled() || !this.client) {
      return;
    }

    try {
      console.log("[Langfuse] Flushing telemetry data...", {
        activeTraces: this.activeTraces.size,
        activeSpans: this.activeSpans.size,
      });
      await this.client.flushAsync();
      console.log("[Langfuse] Flush completed successfully");
    } catch (error) {
      console.warn("[Langfuse] Failed to flush client:", error);
    }
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
      console.warn("Failed to shutdown Langfuse client:", error);
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
