import { getLangChainClient } from "../../langchain.client";
import type { OllamaEmbeddings } from "@langchain/ollama";
import { TextPreprocessor, type TextChunk } from "./text-preprocessor";
import { createEmbeddingsConfig, type EmbeddingsConfig } from "./embeddings.config";

/**
 * Interface for an embeddings service.
 */
export interface IEmbeddingsService {
  /**
   * Generates embeddings for a piece of text.
   *
   * @param text - The text to embed.
   * @returns A vector of numbers representing the text's embeddings.
   */
  generateEmbeddings(text: string, options?: EmbeddingsServiceOptions): Promise<number[]>;
}

/**
 * Options for configuring the EmbeddingsService.
 */
export interface EmbeddingsServiceOptions {
  /** Maximum characters per chunk (default: 4096) */
  chunkSize?: number;
  /** Overlap between consecutive chunks (default: 200) */
  chunkOverlap?: number;
  /**
   * Maximum number of chunks to process concurrently.
   * Use 1 for sequential processing (default: 1).
   */
  concurrencyLimit?: number;
  /**
   * If true, use weighted averaging when combining chunk embeddings.
   * Each chunk is weighted by its length (default: false).
   */
  weightChunks?: boolean;
  /**
   * Optional correlation ID for the embeddings generation.
   */
  correlationId?: string;
}

/**
 * An EmbeddingsService that uses LangChain's OllamaEmbeddings under the hood.
 * This implementation splits long texts into chunks (with overlap) and then
 * averages (or weighted-averages) the resulting vectors.
 */
export class EmbeddingsService implements IEmbeddingsService {
  private readonly _embeddings: OllamaEmbeddings;
  private readonly _config: EmbeddingsConfig;
  private readonly _textPreprocessor: TextPreprocessor;

  constructor(model: string, expectedVectorSize: number, options?: EmbeddingsServiceOptions) {
    // Create configuration from options
    this._config = createEmbeddingsConfig({
      model,
      expectedVectorSize,
      ...options,
    });

    // Initialize dependencies
    const client = getLangChainClient();
    this._embeddings = client.createEmbeddings(this._config.model);
    this._textPreprocessor = new TextPreprocessor(this._config);
  }

  /**
   * Generates embeddings for a piece of text.
   * @param text - The text to embed.
   * @returns A vector of numbers representing the text's embeddings.
   */
  public async generateEmbeddings(text: string, options?: EmbeddingsServiceOptions): Promise<number[]> {
    const correlationId = options?.correlationId;

    try {
      // Split text into chunks using the text preprocessor
      const chunks = this._textPreprocessor.chunkText(text);

      if (!this._textPreprocessor.validateChunks(chunks, text)) {
        throw new Error("Chunk validation failed - text may have been corrupted during preprocessing");
      }

      console.info("Starting embeddings generation", {
        correlationId,
        chunkCount: chunks.length,
        totalLength: text.length,
      });

      // Process chunks and generate embeddings
      const chunkVectors = await this._processChunks(chunks, correlationId);

      // Combine the embeddings using weighted or simple averaging
      const averagedVector = this._config.weightChunks
        ? this._weightedAverageVectors(
            chunkVectors,
            chunks.map((c) => c.length),
          )
        : this._averageVectors(chunkVectors);

      if (averagedVector.length !== this._config.expectedVectorSize) {
        throw new Error(`Unexpected embeddings size: ${averagedVector.length}`);
      }

      console.info("Completed embeddings generation", {
        correlationId,
        processedChunks: chunks.length,
        vectorSize: averagedVector.length,
      });

      return averagedVector;
    } catch (err) {
      console.error("Failed to generate embeddings", {
        correlationId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Processes chunks either sequentially or concurrently based on configuration.
   */
  private async _processChunks(chunks: TextChunk[], correlationId?: string): Promise<number[][]> {
    if (this._config.concurrencyLimit === 1) {
      return this._processChunksSequentially(chunks, correlationId);
    }
    return this._processChunksConcurrently(chunks, correlationId);
  }

  /**
   * Processes chunks sequentially.
   */
  private async _processChunksSequentially(chunks: TextChunk[], correlationId?: string): Promise<number[][]> {
    const vectors: number[][] = [];

    for (const chunk of chunks) {
      const vec = await this._embedChunkWithRetry(chunk, correlationId);
      vectors.push(vec);

      console.debug(`Processed chunk ${chunk.index + 1}/${chunks.length}`, {
        correlationId,
        chunkIndex: chunk.index,
        chunkLength: chunk.length,
      });
    }

    return vectors;
  }

  /**
   * Processes chunks concurrently with retry logic.
   */
  private async _processChunksConcurrently(chunks: TextChunk[], correlationId?: string): Promise<number[][]> {
    const results: number[][] = new Array(chunks.length);
    const tasks = chunks.map((chunk) => async () => {
      results[chunk.index] = await this._embedChunkWithRetry(chunk, correlationId);
      console.debug(`Processed chunk ${chunk.index + 1}/${chunks.length}`, {
        correlationId,
        chunkIndex: chunk.index,
        chunkLength: chunk.length,
      });
    });

    let currentIndex = 0;
    const pool: Promise<void>[] = [];

    const runNext = async (): Promise<void> => {
      if (currentIndex >= tasks.length) return;
      const taskIndex = currentIndex;
      currentIndex++;
      await tasks[taskIndex]();
      await runNext();
    };

    for (let i = 0; i < Math.min(this._config.concurrencyLimit, tasks.length); i++) {
      pool.push(runNext());
    }

    await Promise.all(pool);
    return results;
  }

  /**
   * Embeds a single chunk with retry logic.
   */
  private async _embedChunkWithRetry(chunk: TextChunk, correlationId?: string): Promise<number[]> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this._config.maxRetries; attempt++) {
      try {
        const vec = await this._embeddings.embedQuery(chunk.content);

        if (vec.length !== this._config.expectedVectorSize) {
          throw new Error(
            `Unexpected vector size for chunk. Expected ${this._config.expectedVectorSize}, got ${vec.length}`,
          );
        }

        return vec;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this._config.maxRetries) {
          const delay = this._config.retryDelayMs * attempt;
          console.warn(`Retry attempt ${attempt} for chunk ${chunk.index}`, {
            correlationId,
            error: lastError.message,
            delay,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Averages a list of vectors (simple arithmetic mean).
   */
  private _averageVectors(vectors: number[][]): number[] {
    if (vectors.length === 0) {
      throw new Error("No vectors to average.");
    }
    return vectors[0].map((_, i) => vectors.reduce((sum, vec) => sum + vec[i], 0) / vectors.length);
  }

  /**
   * Computes a weighted average of vectors.
   */
  private _weightedAverageVectors(vectors: number[][], weights: number[]): number[] {
    if (vectors.length === 0) {
      throw new Error("No vectors to average.");
    }
    if (vectors.length !== weights.length) {
      throw new Error("Mismatch between number of vectors and weights.");
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return vectors[0].map((_, i) => vectors.reduce((sum, vec, idx) => sum + vec[i] * weights[idx], 0) / totalWeight);
  }
}
