import {
  getLangChainClient,
  initLangChainClient,
  DEFAULT_LANGCHAIN_MODEL,
  LANGCHAIN_VECTOR_SIZE,
} from "../../langchain.client";

const ollamaBaseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

initLangChainClient({ baseUrl: ollamaBaseURL });

export interface IEmbeddingsService {
  generateEmbeddings(text: string): Promise<number[]>;
}

export class EmbeddingsService implements IEmbeddingsService {
  private readonly model?: string;
  private readonly expectedVectorSize?: number;

  constructor(model: string, expectedVectorSize: number) {
    this.model = model ?? DEFAULT_LANGCHAIN_MODEL;
    this.expectedVectorSize = expectedVectorSize ?? LANGCHAIN_VECTOR_SIZE;
  }

  public async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const langChainClient = getLangChainClient();
      const embeddings = langChainClient.createEmbeddings(this.model);

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
