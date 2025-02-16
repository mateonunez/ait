import { getLangChainClient } from "../../langchain.client";
import type { OllamaEmbeddings } from "@langchain/ollama";

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
  private readonly _expectedVectorSize: number;
  private readonly _chunkSize: number;
  private readonly _chunkOverlap: number;
  private readonly _concurrencyLimit: number;
  private readonly _weightChunks: boolean;

  constructor(
    private readonly _model: string,
    expectedVectorSize: number,
    options?: EmbeddingsServiceOptions,
  ) {
    // Build an embeddings instance from our shared LangChain client.
    const client = getLangChainClient();
    this._embeddings = client.createEmbeddings(_model);
    this._expectedVectorSize = expectedVectorSize;

    // Use provided options or fallback to defaults.
    this._chunkSize = options?.chunkSize ?? 4096;
    this._chunkOverlap = options?.chunkOverlap ?? 200;
    this._concurrencyLimit = options?.concurrencyLimit ?? 1;
    this._weightChunks = options?.weightChunks ?? false;
  }

  /**
   * Generates embeddings for a piece of text.
   * @param text - The text to embed.
   * @returns A vector of numbers representing the text's embeddings.
   */
  public async generateEmbeddings(text: string, options?: EmbeddingsServiceOptions): Promise<number[]> {
    if (!text || !text.trim()) {
      throw new Error("Input text is empty or whitespace only.");
    }

    try {
      // Split the text into manageable chunks.
      const chunks = this._chunkText(text);
      let chunkVectors: number[][] = [];
      let processedChunks = 0;

      console.info(`[${options?.correlationId}] Starting embeddings generation for ${chunks.length} chunks...`);

      if (this._concurrencyLimit === 1) {
        // Process each chunk sequentially.
        for (const chunk of chunks) {
          const vec = await this._embedChunk(chunk);
          chunkVectors.push(vec);
          processedChunks++;
          console.info(`[${options?.correlationId}] Processed chunk ${processedChunks}/${chunks.length}`);
        }
      } else {
        // Process chunks concurrently with a configurable concurrency limit.
        chunkVectors = await this._processChunksConcurrently(chunks, options);
        processedChunks = chunks.length;
      }

      // Combine the embeddings.
      const averagedVector = this._weightChunks
        ? this._weightedAverageVectors(
            chunkVectors,
            chunks.map((c) => c.length),
          )
        : this._averageVectors(chunkVectors);

      if (averagedVector.length !== this._expectedVectorSize) {
        throw new Error(`Unexpected embeddings size: ${averagedVector.length}`);
      }

      console.info(
        `[${options?.correlationId}] ✅ Completed embeddings generation. Processed ${processedChunks}/${chunks.length} chunks.`,
      );
      console.debug(`Generated embeddings from ${chunks.length} chunks, final vector size: ${averagedVector.length}`);

      return averagedVector;
    } catch (err) {
      console.error("Failed to generate embeddings for text:", err);
      throw err;
    }
  }

  /**
   * Splits the text into chunks with the configured size and overlap.
   * @param text The text to chunk.
   * @returns An array of text chunks.
   */
  private _chunkText(text: string): string[] {
    if (!text || text.length <= this._chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;

    try {
      while (start < text.length) {
        const end = Math.min(start + this._chunkSize, text.length);
        const chunk = text.slice(start, end);

        chunks.push(chunk);

        if (end === text.length) break;

        let newStart = end - this._chunkOverlap;
        if (newStart <= start) {
          newStart = start + 1;
        }
        start = newStart;

        if (start > 1_000_000) {
          console.warn("Text exceeds maximum size limit, truncating...");
          break;
        }
      }

      return chunks;
    } catch (error) {
      console.error("Error in _chunkText:", {
        textLength: text.length,
        chunkSize: this._chunkSize,
        overlap: this._chunkOverlap,
        error,
      });
      throw error;
    }
  }

  /**
   * Averages a list of vectors (simple arithmetic mean).
   * @param vectors An array of embedding vectors.
   * @returns The averaged embedding vector.
   */
  private _averageVectors(vectors: number[][]): number[] {
    if (vectors.length === 0) {
      throw new Error("No vectors to average.");
    }
    return vectors[0].map((_, i) => vectors.reduce((sum, vec) => sum + vec[i], 0) / vectors.length);
  }

  /**
   * Computes a weighted average of vectors.
   * @param vectors An array of embedding vectors.
   * @param weights An array of weights corresponding to each vector.
   * @returns The weighted-averaged embedding vector.
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

  /**
   * Embeds a single chunk and validates the vector size.
   * @param chunk A piece of text.
   * @returns The embedding vector.
   */
  private async _embedChunk(chunk: string): Promise<number[]> {
    const vec = await this._embeddings.embedQuery(chunk);
    if (vec.length !== this._expectedVectorSize) {
      throw new Error(`Unexpected vector size for chunk. Expected ${this._expectedVectorSize}, got ${vec.length}`);
    }
    return vec;
  }

  /**
   * Processes an array of text chunks concurrently while preserving their order.
   * @param chunks An array of text chunks.
   * @returns An array of embedding vectors in the same order as the chunks.
   */
  private async _processChunksConcurrently(chunks: string[], options?: EmbeddingsServiceOptions): Promise<number[][]> {
    const results: number[][] = new Array(chunks.length);
    const tasks = chunks.map((chunk, index) => async () => {
      results[index] = await this._embedChunk(chunk);
      console.info(`[${options?.correlationId}] Processed chunk ${index + 1}/${chunks.length}`);
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

    for (let i = 0; i < Math.min(this._concurrencyLimit, tasks.length); i++) {
      pool.push(runNext());
    }
    await Promise.all(pool);
    return results;
  }
}
