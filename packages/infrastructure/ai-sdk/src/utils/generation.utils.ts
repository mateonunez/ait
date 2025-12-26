import { AItError } from "@ait/core";
import { type EmbeddingModel, type LanguageModel, generateText } from "ai";
import type { ollama } from "ai-sdk-ollama";
import type { ZodType } from "zod";

export const DEFAULT_JSON_INSTRUCTION =
  "IMPORTANT: Respond ONLY with valid JSON that matches the expected schema. Do not include explanations.";

export type CompatibleLanguageModel = LanguageModel | ReturnType<typeof ollama>;
export type CompatibleEmbeddingModel = EmbeddingModel | ReturnType<typeof ollama.embedding>;

export function augmentPrompt(prompt: string, customInstruction?: string): string {
  if (prompt.includes(DEFAULT_JSON_INSTRUCTION)) {
    return prompt;
  }

  if (customInstruction && prompt.includes(customInstruction)) {
    return prompt;
  }

  return [prompt.trim(), customInstruction ?? DEFAULT_JSON_INSTRUCTION].join("\n\n");
}

export function extractJson(text: string): string | null {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = text.slice(firstBrace, lastBrace + 1);
  return candidate.trim().length ? candidate : null;
}

export function nextDelay(attempt: number, baseDelay?: number): number {
  const delay = baseDelay ?? 500;
  return delay * Math.max(1, attempt + 1);
}

export async function wait(ms?: number): Promise<void> {
  if (!ms || ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function attemptStructuredRepair<T>(
  model: CompatibleLanguageModel,
  prompt: string,
  schema: ZodType<T>,
  temperature?: number,
): Promise<{ success: boolean; data?: T; error?: unknown }> {
  try {
    const { text } = await generateText({
      model: model as LanguageModel,
      prompt,
      temperature,
    });

    const jsonPayload = extractJson(text);
    if (!jsonPayload) {
      throw new AItError("PARSE_ERROR", "No JSON object found in repair response");
    }

    const parsed = JSON.parse(jsonPayload);
    const validation = schema.safeParse(parsed);
    if (!validation.success) {
      throw validation.error;
    }

    return { success: true, data: validation.data };
  } catch (error) {
    return { success: false, error };
  }
}
