import { OllamaEmbeddings } from "@langchain/ollama";

export interface IEmbeddingsService {
  generateEmbeddings(text: string): Promise<number[]>;
}

export class ETLEmbeddingsService implements IEmbeddingsService {
  private readonly model?: string;
  private readonly expectedVectorSize?: number;

  constructor(model: string, expectedVectorSize: number) {
    this.model = model ?? "gemma:2b";
    this.expectedVectorSize = expectedVectorSize ?? 2048;
  }

  public async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const embeddings = new OllamaEmbeddings({
        model: this.model,
      });

      const vectors = await embeddings.embedQuery(text);

      console.log(`Generated Langchain embeddings for text "${text}" size:`, vectors.length);

      if (!vectors || vectors.length !== this.expectedVectorSize) {
        throw new Error(`Unexpected embeddings size: ${vectors?.length}`);
      }

      return vectors;
    } catch (error) {
      console.error(`Failed to generate Langchain embeddings for text "${text}":`, error);
      throw error;
    }
  }
}
