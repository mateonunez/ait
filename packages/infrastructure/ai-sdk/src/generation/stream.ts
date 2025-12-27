import { getLogger } from "@ait/core";
import { type LanguageModel, streamText as vercelStreamText } from "ai";
import { createModel, getAItClient } from "../client/ai-sdk.client";
import { buildSystemPromptWithContext, buildSystemPromptWithoutContext } from "../services/prompts/system.prompt";
import { createSpanWithTiming, shouldEnableTelemetry } from "../telemetry/telemetry.middleware";
import type { ChatMessage } from "../types/chat";
import type { TraceContext } from "../types/telemetry";
import { prepareRequestOptions } from "../utils/request.utils";

const logger = getLogger();

export interface StreamOptions {
  prompt: string;
  messages?: ChatMessage[];
  tools?: Record<string, unknown>;
  maxToolRounds?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  enableTelemetry?: boolean;
  /** Trace context for Langfuse telemetry */
  traceContext?: TraceContext;
  /** RAG context to inject into system prompt */
  ragContext?: string;
  /** Custom system message (overrides default AIt prompt) */
  system?: string;
  /** Model override */
  model?: string | LanguageModel;
}

export interface StreamResult {
  textStream: AsyncIterable<string>;
  text: Promise<string>;
}

/**
 * Stream text generation with optional telemetry.
 * Direct wrapper around Vercel AI SDK streamText with AIt system prompt.
 */
export async function stream(options: StreamOptions): Promise<StreamResult> {
  const client = getAItClient();
  let model: LanguageModel;

  if (options.model) {
    model =
      typeof options.model === "string" ? (createModel(options.model) as unknown as LanguageModel) : options.model;
  } else {
    model = client.model as LanguageModel;
  }
  const enableTelemetry = options.enableTelemetry ?? shouldEnableTelemetry();
  const startTime = new Date();

  logger.info("Starting stream generation", { prompt: options.prompt.slice(0, 50) });

  // Build AIt system prompt
  const systemMessage =
    options.system ??
    (options.ragContext ? buildSystemPromptWithContext(options.ragContext) : buildSystemPromptWithoutContext());

  // Create telemetry span for LLM generation if enabled
  const endSpan =
    enableTelemetry && options.traceContext
      ? createSpanWithTiming(
          "llm-generation",
          "generation",
          options.traceContext,
          { prompt: options.prompt, hasRAGContext: !!options.ragContext },
          { model: client.generationModelConfig.name },
          startTime,
        )
      : null;

  // Build request options
  const coreTools = options.tools as any;
  const commonOptions = {
    model,
    system: systemMessage,
    temperature: options.temperature ?? client.config.generation.temperature,
    topP: options.topP ?? client.config.generation.topP,
    topK: options.topK ?? client.config.generation.topK,
    tools: coreTools,
    maxSteps: options.maxToolRounds ?? client.config.textGeneration?.toolExecutionConfig?.maxRounds ?? 5,
  };

  const requestOptions = prepareRequestOptions(options.prompt, commonOptions, options.messages);

  const result = vercelStreamText(requestOptions);

  // Wrap stream with telemetry if we have a span
  const textStream = endSpan ? wrapStreamWithTelemetrySpan(result.textStream, endSpan) : result.textStream;

  return {
    textStream,
    text: Promise.resolve(result.text),
  };
}

async function* wrapStreamWithTelemetrySpan(
  inputStream: AsyncIterable<string>,
  endSpan: (output?: Record<string, unknown>) => void,
): AsyncIterable<string> {
  let fullResponse = "";
  let chunkCount = 0;

  for await (const chunk of inputStream) {
    fullResponse += chunk;
    chunkCount++;
    yield chunk;
  }

  // End span with output including response info
  endSpan({
    response: fullResponse.slice(0, 500), // Truncate for storage
    responseLength: fullResponse.length,
    chunkCount,
  });

  logger.debug("Stream complete", {
    responseLength: fullResponse.length,
    chunkCount,
  });
}

/**
 * Convenience generator version that yields chunks directly.
 */
export async function* streamChunks(options: StreamOptions): AsyncGenerator<string> {
  const { textStream } = await stream(options);
  for await (const chunk of textStream) {
    yield chunk;
  }
}
