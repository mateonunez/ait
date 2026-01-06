import { getLogger } from "@ait/core";
import { type LanguageModel, stepCountIs, streamText as vercelStreamText } from "ai";
import { createModel, getAItClient, modelSupportsTools } from "../client/ai-sdk.client";
import { type ModelName, getModelSpec } from "../config/models.config";
import { buildSystemPromptWithContext, buildSystemPromptWithoutContext } from "../services/prompts/system.prompt";
import { createSpanWithTiming, shouldEnableTelemetry } from "../telemetry/telemetry.middleware";
import { convertToCoreTools } from "../tools/tool.converter";
import type { ChatMessage } from "../types/chat";
import type { TraceContext } from "../types/telemetry";
import type { Tool } from "../types/tools";
import { prepareRequestOptions } from "../utils/request.utils";
import {
  type FinishSnapshot,
  computeMaxSteps,
  defaultToolLoopFallbackMessage,
  shouldAppendFallback,
} from "./tool-loop-controller";

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
  fullStream: AsyncIterable<any>;
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

  logger.info("[Stream] System message constructed", {
    hasRAGContext: !!options.ragContext,
    ragContextLength: options.ragContext?.length,
    systemMessageLength: systemMessage.length,
    systemMessageEndsWithContext: systemMessage.slice(-200),
  });

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

  // Lookup model-specific config (supports per-model temperature, topP, topK)
  const modelName = typeof options.model === "string" ? options.model : client.generationModelConfig.name;
  const modelSpec = getModelSpec(modelName as ModelName, "generation");

  logger.debug("[Stream] Model spec", {
    modelName,
    modelSpec,
  });

  // Only use tools if the model supports them (some cloud models like gemini-3-flash-preview don't)
  // Check specific model spec first, fallback to client default
  const supportsTools = modelSpec?.supportsTools ?? modelSupportsTools();
  const shouldUseTools = options.tools && supportsTools;
  const coreTools = shouldUseTools ? convertToCoreTools(options.tools as unknown as Record<string, Tool>) : undefined;
  const maxToolRounds = options.maxToolRounds ?? client.config.textGeneration?.toolConfig?.maxRounds ?? 5;
  const maxSteps = computeMaxSteps({ maxToolRounds, hasTools: !!coreTools });

  // Resolve final parameters with priority: options > model-specific config > client default
  const finalTemperature = options.temperature ?? modelSpec?.temperature ?? client.config.generation.temperature;
  const finalTopP = options.topP ?? modelSpec?.topP ?? client.config.generation.topP;
  const finalTopK = options.topK ?? modelSpec?.topK ?? client.config.generation.topK;

  logger.debug("[Stream] Using model-specific parameters", {
    modelName,
    temperature: finalTemperature,
    topP: finalTopP,
    topK: finalTopK,
    enableThinking: modelSpec?.enableThinking,
    fromModelSpec: !!modelSpec,
    supportsTools,
  });

  const commonOptions = {
    model,
    system: systemMessage,
    temperature: finalTemperature,
    topP: finalTopP,
    topK: finalTopK,
    tools: coreTools,
    maxSteps,
  };

  const requestOptions = prepareRequestOptions(options.prompt, commonOptions, options.messages);

  let finishSnapshot: FinishSnapshot = { textLength: 0, totalToolResults: 0 };

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
      finishSnapshot = {
        textLength: event.text.length,
        totalToolResults: event.toolResults?.length ?? 0,
      };

      if (endSpan) {
        endSpan({
          response: event.text.slice(0, 500),
          responseLength: event.text.length,
          usage: event.usage,
          finishReason: event.finishReason,
        });
      }
    },
  });

  /* */
  const wrappedFullStream = result.fullStream;
  const baseStream = result.textStream;

  const hasTools = !!coreTools;
  const fallbackMessage = defaultToolLoopFallbackMessage();

  function shouldAddFallback(hasAnyText: boolean): boolean {
    // Keep the policy in one place (stream + text promise use the same rule).
    return hasTools && shouldAppendFallback(finishSnapshot, hasAnyText ? 1 : 0);
  }

  async function* streamWithFallback(): AsyncIterable<string> {
    let sawAnyChunk = false;

    for await (const chunk of baseStream) {
      sawAnyChunk = true;
      yield chunk;
    }

    if (shouldAddFallback(sawAnyChunk)) {
      yield fallbackMessage;
    }
  }

  async function resolveTextWithFallback(): Promise<string> {
    const generatedText = await result.text;
    return shouldAddFallback(generatedText.length > 0) ? fallbackMessage : generatedText;
  }

  return {
    textStream: streamWithFallback(),
    fullStream: wrappedFullStream,
    text: resolveTextWithFallback(),
  };
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
