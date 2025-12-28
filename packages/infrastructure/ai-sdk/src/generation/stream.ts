import { getLogger } from "@ait/core";
import { type LanguageModel, stepCountIs, streamText as vercelStreamText } from "ai";
import { createModel, getAItClient } from "../client/ai-sdk.client";
import { buildSystemPromptWithContext, buildSystemPromptWithoutContext } from "../services/prompts/system.prompt";
import { createSpanWithTiming, shouldEnableTelemetry } from "../telemetry/telemetry.middleware";
import { convertToCoreTools } from "../tools/tool.converter";
import type { ChatMessage } from "../types/chat";
import type { TraceContext } from "../types/telemetry";
import type { Tool } from "../types/tools";
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
  traceContext?: TraceContext;
  ragContext?: string;
  system?: string;
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
          { model: typeof options.model === "string" ? options.model : client.generationModelConfig.name },
          startTime,
        )
      : null;

  const coreTools = options.tools ? convertToCoreTools(options.tools as unknown as Record<string, Tool>) : undefined;
  const maxToolRounds = options.maxToolRounds ?? client.config.textGeneration?.toolExecutionConfig?.maxRounds ?? 5;
  const maxSteps = coreTools ? maxToolRounds + 1 : 1;

  const commonOptions = {
    model,
    system: systemMessage,
    temperature: options.temperature ?? client.config.generation.temperature,
    topP: options.topP ?? client.config.generation.topP,
    topK: options.topK ?? client.config.generation.topK,
    tools: coreTools,
    maxSteps,
  };

  const requestOptions = prepareRequestOptions(options.prompt, commonOptions, options.messages);

  const result = vercelStreamText({
    ...requestOptions,
    /**
     * IMPORTANT:
     * `streamText` defaults `stopWhen` to `stepCountIs(1)`, which stops after the first step
     * when tool results exist. That yields tool calls/results but no final assistant text.
     *
     * We want true tool-loop behavior up to `maxSteps`.
     */
    stopWhen: coreTools ? stepCountIs(maxSteps) : undefined,
    onStepFinish: (step) => {
      logger.debug("Step finished", {
        finishReason: step.finishReason,
        textLength: step.text?.length ?? 0,
        toolCallsCount: step.toolCalls?.length ?? 0,
        toolResultsCount: step.toolResults?.length ?? 0,
      });
    },
    onFinish: (event) => {
      logger.debug("Stream finished", {
        finishReason: event.finishReason,
        textLength: event.text.length,
        totalToolCalls: event.toolCalls?.length ?? 0,
        totalToolResults: event.toolResults?.length ?? 0,
        totalSteps: event.steps?.length ?? 0,
      });
    },
  });

  const textStream = endSpan ? wrapStreamWithTelemetry(result.textStream, endSpan) : result.textStream;

  return {
    textStream,
    text: Promise.resolve(result.text) as Promise<string>,
  };
}

async function* wrapStreamWithTelemetry(
  inputStream: AsyncIterable<string>,
  endSpan: (output?: Record<string, unknown>) => void,
): AsyncIterable<string> {
  let fullResponse = "";
  let chunkCount = 0;

  try {
    for await (const chunk of inputStream) {
      fullResponse += chunk;
      chunkCount++;
      yield chunk;
    }
  } finally {
    endSpan({
      response: fullResponse.slice(0, 500),
      responseLength: fullResponse.length,
      chunkCount,
    });
  }
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
