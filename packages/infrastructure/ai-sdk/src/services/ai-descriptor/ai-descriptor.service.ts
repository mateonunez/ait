import { getLogger } from "@ait/core";
import { generateText } from "ai";
import { createModel } from "../../client/ai-sdk.client";
import { GenerationModels } from "../../config/models.config";

const logger = getLogger();

export interface AIDescriptorOptions {
  model?: string;
  correlationId?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface VisualDescriptorResult {
  description: string;
  ocr?: string;
  objects?: string[];
  style?: string;
  mood?: string;
  summary: string;
}

export interface TextDescriptorResult {
  summary: string;
  sentiment?: string;
  entities?: string[];
  intent?: string;
  technicalDetails?: string;
}

export interface IAIDescriptorService {
  describeImage(image: Buffer, options?: AIDescriptorOptions): Promise<VisualDescriptorResult>;
  describeText(content: string, context: string, options?: AIDescriptorOptions): Promise<TextDescriptorResult>;
}

export class AIDescriptorService implements IAIDescriptorService {
  public async describeImage(image: Buffer, options?: AIDescriptorOptions): Promise<VisualDescriptorResult> {
    const modelName = options?.model || GenerationModels.LLAVA;
    const model = createModel(modelName);
    const correlationId = options?.correlationId;

    logger.debug("Describing image with AI", { model: modelName, correlationId });

    const prompt = `
      Analyze this image thoroughly and provide a structured JSON response with the following fields:
      - description: A comprehensive narrative description of the image.
      - ocr: Any text visible in the image.
      - objects: A list of key objects or entities detected.
      - style: The artistic or photographic style (e.g., realistic, vintage, minimalist).
      - mood: The emotional tone or atmosphere.
      - summary: A concise 1-sentence summary optimized for search and embedding.

      Respond ONLY with the JSON object.
    `;

    try {
      const { text } = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image },
            ],
          },
        ],
        temperature: options?.temperature ?? 0.2,
      });

      const result = this._parseJsonResponse<VisualDescriptorResult>(text);
      if (!result) {
        throw new Error("Failed to parse visual descriptor JSON response");
      }

      return result;
    } catch (error) {
      logger.error("Error generating visual descriptor", { error, correlationId });
      // Fallback to basic description if JSON parsing fails
      return {
        description: "Image processing failed",
        summary: "Image content unavailable",
      };
    }
  }

  public async describeText(
    content: string,
    context: string,
    options?: AIDescriptorOptions,
  ): Promise<TextDescriptorResult> {
    const modelName = options?.model || GenerationModels.GEMMA_3;
    const model = createModel(modelName);
    const correlationId = options?.correlationId;

    logger.debug("Describing text with AI", { contentPrefix: content.slice(0, 50), model: modelName, correlationId });

    const prompt = `
      You are an expert content analyzer. Analyze the following content in the context of "${context}".
      Provide a structured JSON response with:
      - summary: A concise summary of the content.
      - sentiment: The overall tone or sentiment (if applicable).
      - entities: Key people, places, or concepts mentioned.
      - intent: The perceived goal or purpose of the content.
      - technicalDetails: Any domain-specific details (e.g., code complexity for GitHub, genre for Spotify).

      Content:
      "${content}"

      Respond ONLY with the JSON object.
    `;

    try {
      const { text } = await generateText({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: options?.temperature ?? 0.3,
      });

      const result = this._parseJsonResponse<TextDescriptorResult>(text);
      if (!result) {
        throw new Error("Failed to parse text descriptor JSON response");
      }

      return result;
    } catch (error) {
      logger.error("Error generating text descriptor", { error, correlationId });
      return {
        summary: "Text processing failed",
      };
    }
  }

  private _parseJsonResponse<T>(text: string): T | null {
    try {
      // Find JSON block if it resides within markdown
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonStr) as T;
    } catch {
      return null;
    }
  }
}

let instance: AIDescriptorService | null = null;

export const getAIDescriptorService = () => {
  if (!instance) {
    instance = new AIDescriptorService();
  }
  return instance;
};
