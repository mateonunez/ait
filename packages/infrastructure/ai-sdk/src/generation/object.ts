import { AItError, getLogger } from "@ait/core";
import { type LanguageModel, generateObject as vercelGenerateObject } from "ai";
import type { ZodType } from "zod";
import { getAItClient } from "../client/ai-sdk.client";
import { attemptStructuredRepair, augmentPrompt, nextDelay, wait } from "../utils/generation.utils";

const logger = getLogger();

const DEFAULT_STRUCTURED_MAX_RETRIES = 2;

export interface ObjectGenerateOptions<T> {
  prompt: string;
  schema: ZodType<T>;
  temperature?: number;
  jsonInstruction?: string;
  maxRetries?: number;
  delayMs?: number;
}

/**
 * Generate a structured object with retry and repair logic.
 */
export async function generateObject<T>(options: ObjectGenerateOptions<T>): Promise<T> {
  const client = getAItClient();
  const model = client.model as LanguageModel;

  const prompt = augmentPrompt(options.prompt, options.jsonInstruction);
  const configuredRetries = client.config.textGeneration?.retryConfig?.maxRetries ?? DEFAULT_STRUCTURED_MAX_RETRIES;
  const maxRetries = options.maxRetries ?? configuredRetries;
  const baseTemperature = options.temperature ?? client.config.generation.temperature;
  const delayMs = options.delayMs ?? client.config.textGeneration?.retryConfig?.delayMs;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { object } = await vercelGenerateObject({
        model,
        schema: options.schema,
        prompt,
        temperature: baseTemperature,
      });

      return object as T;
    } catch (error) {
      lastError = error;
      const isFinalAttempt = attempt >= maxRetries;

      logger.warn("Structured generation attempt failed", {
        attempt,
        maxRetries,
        error: error instanceof Error ? error.message : String(error),
      });

      if (isFinalAttempt) {
        break;
      }

      try {
        const repaired = await attemptStructuredRepair(model, prompt, options.schema, baseTemperature);
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
