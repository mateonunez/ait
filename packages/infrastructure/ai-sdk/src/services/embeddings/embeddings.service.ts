import { AItError } from "@ait/core";
import { getLogger } from "@ait/core";
import { getAItClient } from "../../client/ai-sdk.client";
import { createSpanWithTiming, shouldEnableTelemetry } from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";
import { type TokenizerService, getTokenizer } from "../tokenizer/tokenizer.service";
import { type EmbeddingsConfig, createEmbeddingsConfig } from "./embeddings.config";
import { type TextChunk, TextPreprocessor } from "./text-preprocessor";

export interface IEmbeddingsService {
  generateEmbeddings(text: string, options?: EmbeddingsServiceOptions): Promise<number[]>;
}

export interface EmbeddingsServiceOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  concurrencyLimit?: number;
  weightChunks?: boolean;
  correlationId?: string;
  enableTelemetry?: boolean;
  traceContext?: any;
}

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
      const chunks = this._textPreprocessor.chunkText(text);

      if (!this._textPreprocessor.validateChunks(chunks, text)) {
        throw new AItError(
          "EMBEDDINGS_VALIDATION",
          "Chunk validation failed - text may have been corrupted during preprocessing",
        );
      }

      if (enableTelemetry && traceContext) {
        const endChunkSpan = createSpanWithTiming("text-chunking", "embedding", traceContext, {
          text: text.slice(0, 100),
        });
        if (endChunkSpan) {
          endChunkSpan({
            chunkCount: chunks.length,
          });
        }
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

      if (enableTelemetry && traceContext) {
        const endEmbedSpan = createSpanWithTiming(
          "embedding-generation",
          "embedding",
          traceContext,
          {
            text: text.slice(0, 100),
            chunkCount: chunks.length,
          },
          {
            model: this._config.model,
          },
        );
        if (endEmbedSpan) {
          endEmbedSpan({
            vectorSize: averagedVector.length,
            duration,
            estimatedTokens,
          });
        }
      }

      return averagedVector;
    } catch (err) {
      getLogger().error("Failed to generate embeddings", {
        correlationId,
        error: err instanceof Error ? err.message : String(err),
        model: this._config.model,
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
        const client = getAItClient();

        const vec = await client.embeddingsModel.doEmbed(chunk.content);

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
          getLogger().warn(`Retry attempt ${attempt} for chunk ${chunk.index}`, {
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
