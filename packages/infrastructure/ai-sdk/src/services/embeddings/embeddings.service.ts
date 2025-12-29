import { AItError } from "@ait/core";
import { getLogger } from "@ait/core";
import { getAItClient } from "../../client/ai-sdk.client";
import { createSpanWithTiming, shouldEnableTelemetry } from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";
import { getAIDescriptorService } from "../ai-descriptor/ai-descriptor.service";
import { type TokenizerService, getTokenizer } from "../tokenizer/tokenizer.service";
import { type EmbeddingsConfig, createEmbeddingsConfig } from "./embeddings.config";
import { type TextChunk, TextPreprocessor } from "./text-preprocessor";

const client = getAItClient();

export interface IEmbeddingsService {
  generateEmbeddings(text: string, options?: EmbeddingsServiceOptions): Promise<number[]>;
  generateImageEmbeddings(
    image: Buffer,
    options?: EmbeddingsServiceOptions,
  ): Promise<{ vector: number[]; description: string }>;
  generateImageEmbeddingsFromUrl(
    url: string,
    options?: EmbeddingsServiceOptions,
  ): Promise<{ vector: number[]; description: string }>;
}

export interface EmbeddingsServiceOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  concurrencyLimit?: number;
  weightChunks?: boolean;
  correlationId?: string;
  enableTelemetry?: boolean;
  traceContext?: any;
  visionModel?: string;
}

const logger = getLogger();

export class EmbeddingsService implements IEmbeddingsService {
  private readonly _config: EmbeddingsConfig;
  private readonly _textPreprocessor: TextPreprocessor;
  private readonly _tokenizer: TokenizerService;

  constructor(model: string, expectedVectorSize: number, options?: EmbeddingsServiceOptions) {
    this._config = createEmbeddingsConfig({
      model,
      expectedVectorSize,
      ...options,
    });

    this._textPreprocessor = new TextPreprocessor(this._config);
    this._tokenizer = getTokenizer();
  }

  public async generateEmbeddings(text: string, options?: EmbeddingsServiceOptions): Promise<number[]> {
    const correlationId = options?.correlationId;
    const enableTelemetry = shouldEnableTelemetry(options);
    const traceContext = options?.traceContext as TraceContext | null;

    const startTime = Date.now();

    try {
      // Create overall embedding span at start for accurate timing
      const endEmbedSpan =
        enableTelemetry && traceContext
          ? createSpanWithTiming("embedding/generation", "embedding", traceContext, {
              text: text.slice(0, 100),
            })
          : null;

      const chunks = this._textPreprocessor.chunkText(text);

      if (!this._textPreprocessor.validateChunks(chunks, text)) {
        throw new AItError(
          "EMBEDDINGS_VALIDATION",
          "Chunk validation failed - text may have been corrupted during preprocessing",
        );
      }

      const chunkVectors = await this._processChunks(chunks, correlationId);
      const averagedVector = this._config.weightChunks
        ? this._weightedAverageVectors(
            chunkVectors,
            chunks.map((c) => c.length),
          )
        : this._averageVectors(chunkVectors);

      if (averagedVector.length !== this._config.expectedVectorSize) {
        throw new AItError("EMBEDDINGS_SIZE", `Unexpected embeddings size: ${averagedVector.length}`);
      }

      const duration = Date.now() - startTime;

      // Track embedding tokens for cost analysis
      const estimatedTokens = this._tokenizer.countTokens(text);

      const telemetryData = {
        vectorSize: averagedVector.length,
        chunkCount: chunks.length,
        duration,
        estimatedTokens,
        model: this._config.model,
      };

      if (endEmbedSpan) {
        endEmbedSpan(telemetryData);
      }
      logger.info("Embeddings generated", {
        correlationId,
        duration,
        estimatedTokens,
        model: this._config.model,
        telemetryData,
      });

      return averagedVector;
    } catch (err) {
      logger.error("Failed to generate embeddings", {
        correlationId,
        error: err instanceof Error ? err.message : String(err),
        model: this._config.model,
      });
      throw err;
    }
  }

  public async generateImageEmbeddings(
    image: Buffer,
    options?: EmbeddingsServiceOptions,
  ): Promise<{ vector: number[]; description: string }> {
    const correlationId = options?.correlationId;

    try {
      const aiDescriptor = getAIDescriptorService();
      const visionResult = await aiDescriptor.describeImage(image, {
        model: options?.visionModel,
        correlationId,
      });

      logger.debug("Generated multi-faceted image description for embedding", {
        correlationId,
        hasOcr: !!visionResult.ocr,
        objectCount: visionResult.objects?.length,
      });

      // Combine facets for the embedding text
      const embeddingText = [
        `Description: ${visionResult.description}`,
        visionResult.ocr ? `Text found: ${visionResult.ocr}` : null,
        visionResult.objects?.length ? `Objects: ${visionResult.objects.join(", ")}` : null,
        visionResult.style ? `Style: ${visionResult.style}` : null,
        visionResult.mood ? `Mood: ${visionResult.mood}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const vector = await this.generateEmbeddings(embeddingText, options);

      return { vector, description: visionResult.summary };
    } catch (err) {
      logger.error("Failed to generate image embeddings", {
        correlationId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  public async generateImageEmbeddingsFromUrl(
    url: string,
    options?: EmbeddingsServiceOptions,
  ): Promise<{ vector: number[]; description: string }> {
    const correlationId = options?.correlationId;

    try {
      logger.debug("Fetching image from URL for vision embedding", { url, correlationId });
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return await this.generateImageEmbeddings(buffer, options);
    } catch (err) {
      logger.error("Failed to generate image embeddings from URL", {
        correlationId,
        url,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  private async _processChunks(chunks: TextChunk[], correlationId?: string): Promise<number[][]> {
    if (this._config.concurrencyLimit === 1) {
      return this._processChunksSequentially(chunks, correlationId);
    }
    return this._processChunksConcurrently(chunks, correlationId);
  }

  private async _processChunksSequentially(chunks: TextChunk[], correlationId?: string): Promise<number[][]> {
    const vectors: number[][] = [];

    for (const chunk of chunks) {
      const vector = await this._embedChunkWithRetry(chunk, correlationId);
      vectors.push(vector);
    }

    return vectors;
  }

  private async _processChunksConcurrently(chunks: TextChunk[], correlationId?: string): Promise<number[][]> {
    const results: number[][] = new Array(chunks.length);
    const tasks = chunks.map((chunk) => async () => {
      const vector = await this._embedChunkWithRetry(chunk, correlationId);
      results[chunk.index] = vector;
    });

    let currentIndex = 0;
    const pool: Promise<void>[] = [];

    const runNext = async (): Promise<void> => {
      if (currentIndex >= tasks.length) return;
      const taskIndex = currentIndex;
      currentIndex++;
      await tasks[taskIndex]!();
      await runNext();
    };

    for (let i = 0; i < Math.min(this._config.concurrencyLimit, tasks.length); i++) {
      pool.push(runNext());
    }

    await Promise.all(pool);
    return results;
  }

  private async _embedChunkWithRetry(chunk: TextChunk, correlationId?: string): Promise<number[]> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this._config.maxRetries; attempt++) {
      try {
        const vec = await client.embed(chunk.content);

        if (vec.length !== this._config.expectedVectorSize) {
          throw new AItError(
            "EMBEDDINGS_SIZE",
            `Unexpected vector size for chunk. Expected ${this._config.expectedVectorSize}, got ${vec.length}`,
          );
        }

        return vec;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this._config.maxRetries) {
          const delay = this._config.retryDelayMs * attempt;
          logger.warn(`Retry attempt ${attempt} for chunk ${chunk.index}`, {
            correlationId,
            error: lastError.message,
            delay,
            model: this._config.model,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private _averageVectors(vectors: number[][]): number[] {
    if (vectors.length === 0) {
      throw new AItError("AVERAGE_EMPTY", "No vectors to average.");
    }
    return vectors[0]!.map((_, i) => vectors.reduce((sum, vec) => sum + (vec[i]! as number), 0) / vectors.length);
  }

  private _weightedAverageVectors(vectors: number[][], weights: number[]): number[] {
    if (vectors.length === 0) {
      throw new AItError("AVERAGE_EMPTY", "No vectors to average.");
    }
    if (vectors.length !== weights.length) {
      throw new AItError("WEIGHTS_MISMATCH", "Mismatch between number of vectors and weights.");
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return vectors[0]!.map(
      (_, i) =>
        vectors.reduce((sum, vec, idx) => sum + (vec[i]! as number) * (weights[idx]! as number), 0) / totalWeight,
    );
  }
}
