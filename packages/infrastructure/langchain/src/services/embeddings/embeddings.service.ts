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
  generateEmbeddings(text: string): Promise<number[]>;
}

/**
 * An EmbeddingsService that uses LangChain's OllamaEmbeddings under the hood.
 */
export class EmbeddingsService implements IEmbeddingsService {
  private readonly _embeddings: OllamaEmbeddings;
  private readonly _expectedVectorSize: number;

  constructor(
    private readonly _model: string,
    expectedVectorSize: number,
  ) {
    // Build an embeddings instance from our shared LangChain client
    const client = getLangChainClient();
    this._embeddings = client.createEmbeddings(_model);
    this._expectedVectorSize = expectedVectorSize;
  }

  public async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // You could embed many documents at once, but we'll do a single text
      const vectors = await this._embeddings.embedQuery(text);

      if (vectors.length !== this._expectedVectorSize) {
        throw new Error(`Unexpected embeddings size: ${vectors.length}`);
      }
      console.debug(`Generated Langchain embeddings for text "${text}" size: ${vectors.length}`);
      return vectors;
    } catch (err) {
      console.error(`Failed to generate Langchain embeddings for text "${text}":`, err);
      throw err;
    }
  }
}
