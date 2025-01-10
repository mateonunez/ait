import { getLangChainClient } from "../../langchain.client";
import { EmbeddingsService, type IEmbeddingsService } from "../embeddings/embeddings.service";
import { QdrantVectorStore } from "@langchain/qdrant";

export class TextGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextGenerationError";
  }
}

export interface ITextGenerationService {
  generateText(prompt: string): Promise<string>;
}

export class TextGenerationService implements ITextGenerationService {
  private _embeddingService: IEmbeddingsService;

  constructor(
    private readonly _model = "gemma:2b",
    private readonly _expectedVectorSize = 2048,
    private readonly _collectionName: string = "langchain",
  ) {
    this._embeddingService = new EmbeddingsService(this._model, this._expectedVectorSize);
  }

  async generateText(prompt: string): Promise<string> {
    try {
      if (!prompt?.trim()) {
        throw new TextGenerationError("Prompt cannot be empty");
      }

      const embeddings = await this._embeddingService.generateEmbeddings(prompt);

      // Use existing collection
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        {
          embedQuery: async (query: string) => embeddings,
          embedDocuments: async (documents: string[]) => {
            const embeddings = await Promise.all(
              documents.map((doc) => this._embeddingService.generateEmbeddings(doc)),
            );
            return embeddings;
          },
        },
        {
          url: process.env.QDRANT_URL,
          collectionName: this._collectionName,
        },
      );

      const results = await vectorStore.similaritySearch(prompt, 50);

      const context = results
        .map((doc) => doc.pageContent)
        .filter(Boolean)
        .join("\n\n");

      const finalPrompt = `
        Based on this context:
        ${context}

        Generates a response to the prompt: ${prompt}
      `;

      const langChainClient = getLangChainClient();
      const llm = langChainClient.createLLM(this._model);
      const generatedText = await llm.invoke(finalPrompt);
      console.debug("Generated text:", generatedText);
      return generatedText;
    } catch (error: any) {
      const errorMessage = `Failed to generate text: ${error.message}`;
      console.error(errorMessage);
      throw new TextGenerationError(errorMessage);
    }
  }
}
