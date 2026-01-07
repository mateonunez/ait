import { AItError, getLogger } from "@ait/core";
import { type LanguageModel, generateObject as vercelGenerateObject } from "ai";
import type { ZodType } from "zod";
import { getAItClient } from "../client/ai-sdk.client";
import { getModelSpec } from "../config/models.config";
import { attemptStructuredRepair, augmentPrompt, nextDelay, wait } from "../utils/generation.utils";

const logger = getLogger();

const DEFAULT_STRUCTURED_MAX_RETRIES = 2;

export interface ObjectGenerateOptions<T> {
  prompt: string;
  schema: unknown;
  temperature?: number;
  jsonInstruction?: string;
  maxRetries?: number;
  delayMs?: number;
}

export async function generateObject<T>(options: ObjectGenerateOptions<T>): Promise<T> {
  const client = getAItClient();
  const modelName = client.generationModelConfig.name;
  const modelSpec = getModelSpec(modelName as any, "generation");
  const model = client.model as LanguageModel;

  const configuredRetries = client.config.textGeneration?.retryConfig?.maxRetries ?? DEFAULT_STRUCTURED_MAX_RETRIES;
  const maxRetries = options.maxRetries ?? configuredRetries;
  const baseTemperature = options.temperature ?? client.config.generation.temperature;
  const delayMs = options.delayMs ?? client.config.textGeneration?.retryConfig?.delayMs;

  const supportsNativeStructured = modelSpec?.supportsStructuredOutputs ?? true;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If the model supports native structured outputs, we don't augment the prompt
      const prompt = supportsNativeStructured ? options.prompt : augmentPrompt(options.prompt, options.jsonInstruction);

      const { object } = await vercelGenerateObject({
        model,
        schema: options.schema as ZodType<T>,
        prompt,
        temperature: baseTemperature,
        // Native JSON mode for Ollama/etc
        mode: supportsNativeStructured ? "json" : undefined,
      });

      return object as T;
    } catch (error) {
      lastError = error;
      const isFinalAttempt = attempt >= maxRetries;

      logger.warn("Structured generation attempt failed", {
        attempt,
        maxRetries,
        model: modelName,
        supportsNativeStructured,
        error: error instanceof Error ? error.message : String(error),
      });

      if (isFinalAttempt) {
        break;
      }

      // Fallback: search and repair logic if native failed or not supported
      try {
        const prompt = augmentPrompt(options.prompt, options.jsonInstruction);
        const repaired = await attemptStructuredRepair(model, prompt, options.schema as ZodType<T>, baseTemperature);
        if (repaired.success) {
          return repaired.data as T;
        }
        lastError = repaired.error ?? lastError;
      } catch (repairError) {
        lastError = repairError;
      }

      await wait(nextDelay(attempt, delayMs));
    }
  }

  throw new AItError(
    "STRUCTURED_FAILED",
    `Structured generation failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    undefined,
    lastError,
  );
}
